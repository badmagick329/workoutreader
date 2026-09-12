import { mkdir, rename } from "node:fs/promises";
import { createHash } from "node:crypto";
import { parseExercises, parseWorkouts, serializeWorkouts, validateWorkout, type Workout } from "../../../src/workout-log";

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export const revision = (text: string) => createHash("sha256").update(text).digest("hex");
export type Snapshot<T> = { value: T; revision: string };

/** One server owns the data directory. Serializing operations prevents overlapping edits. */
export class WorkoutStore {
  private queue: Promise<unknown> = Promise.resolve();
  constructor(private directory: string) {}
  run<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.queue.then(async () => { await this.recover(); return operation(); });
    this.queue = result.catch(() => {});
    return result;
  }
  async read(name: string): Promise<string> {
    const file = Bun.file(`${this.directory}/${name}`);
    return await file.exists() ? file.text() : "";
  }
  async write(name: string, text: string, backup = true): Promise<void> {
    await mkdir(this.directory, { recursive: true });
    const path = `${this.directory}/${name}`;
    if (backup && await Bun.file(path).exists()) await this.write(`${name}.bak`, await this.read(name), false);
    await Bun.write(`${path}.tmp`, text);
    await rename(`${path}.tmp`, path);
  }
  async snapshot<T>(name: string, decode: (text: string) => T): Promise<Snapshot<T>> {
    const text = await this.read(name);
    return { value: decode(text), revision: revision(text) };
  }
  async check(name: string, expected: unknown): Promise<void> {
    if (typeof expected !== "string" || expected !== revision(await this.read(name))) {
      throw new HttpError(412, "Changed in another tab or device. Your edits are kept here. Reload the saved version before trying again.");
    }
  }
  async saveLog(text: string, expected: unknown): Promise<Snapshot<string>> {
    await this.check("input.txt", expected);
    try { parseExercises(text); } catch (error) { throw new HttpError(400, (error as Error).message); }
    await this.write("input.txt", text);
    return { value: text, revision: revision(text) };
  }
  /** Replaying the journal completes interrupted finishes without appending sets twice. */
  private async recover(): Promise<void> {
    const raw = await this.read("finish-journal.json");
    if (!raw) return;
    const journal = JSON.parse(raw);
    if (!journal.pending) return;
    if (typeof journal.text !== "string" || typeof journal.id !== "string") throw new Error("Invalid finish journal");
    if (await this.read("input.txt") !== journal.text) await this.write("input.txt", journal.text);
    await this.write("current-workout.json", "");
    await this.write("finish-journal.json", JSON.stringify({ id: journal.id, pending: false }), false);
  }
  async finish(id: string, expectedDraft: unknown, expectedLog: unknown, conflict?: "merge" | "overwrite") {
    const receipt = await this.read("finish-journal.json");
    if (receipt && JSON.parse(receipt).id === id) return { conflict: false };
    await this.check("current-workout.json", expectedDraft);
    await this.check("input.txt", expectedLog);
    const raw = await this.read("current-workout.json");
    if (!raw) throw new HttpError(404, "No active workout");
    const draft: Workout = JSON.parse(raw);
    validateWorkout(draft);
    if (!parseExercises([draft.date, ...draft.lines].join("\n")).length) throw new HttpError(400, "Record at least one completed set before finishing");
    const workouts = parseWorkouts(await this.read("input.txt"));
    const existing = workouts.find(workout => workout.date === draft.date);
    if (existing && !conflict) return { conflict: true, existing };
    if (existing) existing.lines = conflict === "merge" ? [...existing.lines, ...draft.lines] : draft.lines;
    else workouts.push({ date: draft.date, lines: draft.lines });
    await this.write("finish-journal.json", JSON.stringify({ id, pending: true, text: serializeWorkouts(workouts) }), false);
    await this.recover();
    return { conflict: false };
  }
}
