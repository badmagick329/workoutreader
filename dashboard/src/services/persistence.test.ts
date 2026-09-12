import { describe, expect, spyOn, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { SavedEdits, warnBeforeClosingEdits } from "../lib/saved-edits";
import { createApi } from "../server/api";
import { fetchExerciseSettings, fetchWorkoutInput, saveExerciseSettings, saveWorkoutInput, setExerciseArchived } from "./exerciseApi";

function tabStorage() {
  const values = new Map<string, string>();
  return {
    get length() { return values.size; },
    key: (index: number) => Array.from(values.keys())[index] ?? null,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  };
}

async function scenario(action: (api: ReturnType<typeof createApi>, intercept: (handler: (req: Request) => Promise<Response | undefined>) => void) => Promise<void>) {
  const dir = await mkdtemp(join(tmpdir(), "workoutreader-client-test-"));
  const api = createApi(dir);
  let beforeRequest: ((req: Request) => Promise<Response | undefined>) | undefined;
  const fetchMock = spyOn(globalThis, "fetch").mockImplementation(Object.assign(async (input: Parameters<typeof fetch>[0], init?: RequestInit): Promise<Response> => {
    const req = new Request(new URL(String(input), "http://localhost"), init);
    return await beforeRequest?.(req) ?? api(req);
  }, { preconnect: globalThis.fetch.preconnect }));
  try { await action(api, handler => { beforeRequest = handler; }); }
  finally {
    fetchMock.mockRestore();
    if (dirname(resolve(dir)) !== resolve(tmpdir()) || !basename(dir).startsWith("workoutreader-client-test-")) throw new Error("Unexpected test directory");
    await rm(dir, { recursive: true });
  }
}

describe("client persistence regressions", () => {
  test("the app warns about edits after leaving the editor and after refresh", () => {
    const storage = tabStorage();
    const page = new EventTarget();
    const warn = (event: Event) => warnBeforeClosingEdits(event as BeforeUnloadEvent, storage);
    page.addEventListener("beforeunload", warn);
    const closeTab = () => {
      const event = new Event("beforeunload", { cancelable: true });
      page.dispatchEvent(event);
      return event.defaultPrevented;
    };
    expect(closeTab()).toBe(false);
    // The editor instance is gone; only the app listener and cached edits remain.
    new SavedEdits<string>("workout-input", storage).write({ value: "260101\nsquat 30b 5", revision: "original" });
    expect(closeTab()).toBe(true);
    page.removeEventListener("beforeunload", warn);
    page.addEventListener("beforeunload", event => warnBeforeClosingEdits(event as BeforeUnloadEvent, storage));
    expect(closeTab()).toBe(true);
    new SavedEdits<string>("workout-input", storage).clear();
    expect(closeTab()).toBe(false);
  });

  test("saving one editor keeps the warning until every cached edit is resolved", () => {
    const storage = tabStorage();
    const log = new SavedEdits<string>("workout-input", storage);
    const session = new SavedEdits<string>("sessions/260101", storage);
    const submitted = { value: "260101\nsquat 30b 5", revision: "original" };
    log.write(submitted);
    session.write(submitted);
    log.acknowledge(submitted, "saved");
    const event = new Event("beforeunload", { cancelable: true });
    warnBeforeClosingEdits(event as BeforeUnloadEvent, storage);
    expect(event.defaultPrevented).toBe(true);
    session.acknowledge(submitted, "saved");
    storage.setItem("unrelated-preference", "dark");
    const cleanEvent = new Event("beforeunload", { cancelable: true });
    warnBeforeClosingEdits(cleanEvent as BeforeUnloadEvent, storage);
    expect(cleanEvent.defaultPrevented).toBe(false);
  });

  test("saving one tab cannot authorize another tab's stale edits after refresh", () => scenario(async () => {
    const original = await fetchWorkoutInput();
    const storageA = tabStorage();
    const storageB = tabStorage();
    const tabA = new SavedEdits<string>("workout-input", storageA);
    const tabB = new SavedEdits<string>("workout-input", storageB);
    tabA.write({ value: "260101\nsquat 30b 5", revision: original.revision });
    tabB.write({ value: "260101\nbench 20b 8", revision: original.revision });
    const submitted = tabA.read()!;
    const saved = await saveWorkoutInput(submitted.value, submitted.revision);
    tabA.acknowledge(submitted, saved.revision);

    const recovered = new SavedEdits<string>("workout-input", storageB).read()!;
    expect(recovered.revision).toBe(original.revision);
    await expect(saveWorkoutInput(recovered.value, recovered.revision)).rejects.toMatchObject({ status: 412 });
    expect((await fetchWorkoutInput()).value).toBe(submitted.value);
    expect(tabA.read()).toBeNull();
    expect(tabB.read()?.value).toBe("260101\nbench 20b 8");
  }));

  test("edits made in the saving tab while a request runs retain the new revision", () => scenario(async () => {
    const original = await fetchWorkoutInput();
    const storage = tabStorage();
    const edits = new SavedEdits<string>("workout-input", storage);
    const submitted = { value: "260101\nsquat 30b 5", revision: original.revision };
    edits.write(submitted);
    const saving = saveWorkoutInput(submitted.value, submitted.revision);
    edits.write({ ...submitted, value: "260101\nsquat 30b 6" });
    const saved = await saving;
    edits.acknowledge(submitted, saved.revision);
    const recovered = new SavedEdits<string>("workout-input", storage).read()!;
    expect(recovered).toEqual({ value: "260101\nsquat 30b 6", revision: saved.revision });
    await saveWorkoutInput(recovered.value, recovered.revision);
    expect((await fetchWorkoutInput()).value).toBe(recovered.value);
  }));

  test("archive retry after a concurrent write preserves the other device's changes", () => scenario(async (api, intercept) => {
    const original = await fetchExerciseSettings();
    await saveExerciseSettings(["squat"], original.revision);
    let raced = false;
    intercept(async (req): Promise<Response | undefined> => {
      if (req.method !== "PUT" || raced) return undefined;
      raced = true;
      const current = await (await api(new Request("http://localhost/api/exercise-settings"))).json();
      await api(new Request("http://localhost/api/exercise-settings", {
        method: "PUT", headers: { "If-Match": current.revision },
        body: JSON.stringify({ archivedExerciseNames: ["squat", "row"] }),
      }));
      return undefined;
    });
    await expect(setExerciseArchived("bench", true)).rejects.toMatchObject({ status: 412 });
    expect((await setExerciseArchived("bench", true)).value.archivedExerciseNames).toEqual(["bench", "row", "squat"]);
    expect((await setExerciseArchived("squat", false)).value.archivedExerciseNames).toEqual(["bench", "row"]);
  }));

  test("an archive load failure does not poison the next action", () => scenario(async (_api, intercept) => {
    let failed = false;
    intercept(async () => {
      if (failed) return;
      failed = true;
      return new Response("Unavailable", { status: 503 });
    });
    await expect(fetchExerciseSettings()).rejects.toMatchObject({ status: 503 });
    expect((await setExerciseArchived("bench", true)).value.archivedExerciseNames).toEqual(["bench"]);
  }));
});
