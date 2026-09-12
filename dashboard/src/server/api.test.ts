import { describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApi } from "./api";
import { WorkoutStore, revision } from "./store";

async function scenario(action: (api: ReturnType<typeof createApi>, dir: string) => Promise<void>) {
  const dir = await mkdtemp(join(tmpdir(), "workoutreader-test-"));
  try { await action(createApi(dir), dir); } finally { await rm(dir, { recursive: true }); }
}
const call = (api: ReturnType<typeof createApi>, path: string, method = "GET", body?: unknown, rev?: string) => api(new Request(`http://localhost/api/${path}`, { method, headers: { "Content-Type": "application/json", ...(rev ? { "If-Match": rev } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) }));

describe("safe workout storage", () => {
  test("session edits preserve other dates and reject stale undo", () => scenario(async api => {
    await call(api, "workout-input", "PUT", { text: "260101\nsquat 30b 5\n260102\nbench 20b 8" }, revision(""));
    const old = await (await call(api, "sessions/260101")).json();
    const changed = await (await call(api, "sessions/260101", "PUT", { date: "260101", lines: ["squat 30b 6"] }, old.revision)).json();
    expect((await (await call(api, "sessions/260102")).json()).value.lines).toEqual(["bench 20b 8"]);
    expect((await call(api, "sessions/260101", "PUT", old.value, old.revision)).status).toBe(412);
    expect((await call(api, "sessions/260101", "PUT", old.value, changed.revision)).status).toBe(200);
  }));
  test("first run is empty and stale edits cannot replace a newer log", () => scenario(async (api, dir) => {
    const original = await (await call(api, "workout-input")).json();
    expect(original.value).toBe("");
    expect((await call(api, "workout-input", "PUT", { text: "260101\nsquat 30b 5" }, original.revision)).status).toBe(200);
    expect((await call(api, "workout-input", "PUT", { text: "" }, original.revision)).status).toBe(412);
    expect(await Bun.file(join(dir, "input.txt")).text()).toContain("squat");
  }));
  test("finishing records confirmed sets only and retries do not duplicate", () => scenario(async api => {
    const draft = await (await call(api, "workout-draft", "PUT", { date: "260101", lines: ["squat 30b 5"], targets: ["bench 20b 8"] }, revision(""))).json();
    const body = { id: "finish-1", logRevision: revision("") };
    expect((await call(api, "workout-draft/finish", "POST", body, draft.revision)).status).toBe(200);
    expect((await call(api, "workout-draft/finish", "POST", body, draft.revision)).status).toBe(200);
    const exercises = await (await call(api, "exercises")).json();
    expect(exercises).toHaveLength(1);
    expect(exercises[0].name).toBe("squat");
    expect((await (await call(api, "workout-draft")).json()).value).toBeNull();
  }));
  test("interrupted finish is recovered before accepting another write", () => scenario(async (api, dir) => {
    await Bun.write(join(dir, "current-workout.json"), JSON.stringify({ date: "260101", lines: ["squat 30b 5"] }));
    await Bun.write(join(dir, "finish-journal.json"), JSON.stringify({ id: "crashed", pending: true, text: "260101\nsquat 30b 5\n" }));
    expect((await (await call(api, "exercises")).json())).toHaveLength(1);
    expect(await Bun.file(join(dir, "current-workout.json")).text()).toBe("");
  }));
  test("duplicate date finish requires an explicit choice", () => scenario(async api => {
    const log = await (await call(api, "workout-input", "PUT", { text: "260101\nsquat 30b 5" }, revision(""))).json();
    const draft = await (await call(api, "workout-draft", "PUT", { date: "260101", lines: ["bench 20b 8"] }, revision(""))).json();
    const body = { id: "merge", logRevision: log.revision };
    expect((await (await call(api, "workout-draft/finish", "POST", body, draft.revision)).json()).conflict).toBe(true);
    expect((await (await call(api, "workout-draft/finish", "POST", { ...body, conflict: "merge" }, draft.revision)).json()).conflict).toBe(false);
    expect((await (await call(api, "exercises")).json())).toHaveLength(2);
  }));
  test("retains the previous log and serializes competing writes", () => scenario(async (api, dir) => {
    const responses = await Promise.all(["squat", "bench"].map(name => call(api, "workout-input", "PUT", { text: `260101\n${name} 20b 5` }, revision(""))));
    expect(responses.map(response => response.status).sort()).toEqual([200, 412]);
    const before = await (await call(api, "workout-input")).json();
    await call(api, "workout-input", "PUT", { text: "260102\nrow 20w 8" }, before.revision);
    expect(await Bun.file(join(dir, "input.txt.bak")).text()).toBe(before.value);
  }));
});
