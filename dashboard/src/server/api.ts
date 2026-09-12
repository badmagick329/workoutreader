import { parseExercises, parseWorkouts, serializeWorkouts, validateWorkout as checkWorkout, type Workout } from "../../../src/workout-log";
import { HttpError, WorkoutStore } from "./store";

function validateWorkout(value: unknown): asserts value is Workout {
  try { checkWorkout(value); } catch (error) { throw new HttpError(400, (error as Error).message); }
}

export function createApi(directory: string) {
  const store = new WorkoutStore(directory);
  return (req: Request) => store.run(async () => {
    const path = new URL(req.url).pathname;
    const method = req.method;
    const expected = req.headers.get("If-Match");
    const json = (value: unknown) => Response.json(value, { headers: { "Cache-Control": "no-store" } });
    const payload = async () => {
      const text = await req.text();
      if (new TextEncoder().encode(text).length > 1_000_000) throw new HttpError(413, "Workout input is too large");
      try { return JSON.parse(text); } catch { throw new HttpError(400, "Expected valid JSON"); }
    };
    if (path === "/api/hello") return json({ message: "Ready" });
    if (path === "/api/exercises" && method === "GET") return json(parseExercises(await store.read("input.txt")));
    if (path === "/api/workouts" && method === "GET") return json(await store.snapshot("input.txt", text => parseWorkouts(text).sort((a, b) => b.date.localeCompare(a.date))));
    if (path.startsWith("/api/sessions/")) {
      const date = path.slice("/api/sessions/".length);
      const snapshot = await store.snapshot("input.txt", text => text);
      const workouts = parseWorkouts(snapshot.value);
      const session = workouts.find(workout => workout.date === date);
      if (!session) throw new HttpError(404, "Session not found");
      if (method === "GET") return json({ value: session, revision: snapshot.revision });
      if (method === "PUT") {
        const body = await payload();
        validateWorkout(body);
        if (body.date !== date) throw new HttpError(400, "Session date cannot change here");
        if (!parseExercises([date, ...body.lines].join("\n")).length) throw new HttpError(400, "Keep at least one completed set");
        session.lines = body.lines;
        const saved = await store.saveLog(serializeWorkouts(workouts), expected);
        return json({ value: session, revision: saved.revision });
      }
    }
    if (path === "/api/workout-input") {
      if (method === "GET") return json(await store.snapshot("input.txt", text => text));
      if (method === "PUT") {
        const body = await payload();
        if (typeof body?.text !== "string") throw new HttpError(400, "Workout input must be text");
        return json(await store.saveLog(body.text, expected));
      }
    }
    if (path === "/api/workout-draft/finish" && method === "POST") {
      const body = await payload();
      if (typeof body?.id !== "string" || !body.id || ![undefined, "merge", "overwrite"].includes(body.conflict)) throw new HttpError(400, "Invalid finish request");
      return json(await store.finish(body.id, expected, body.logRevision, body.conflict));
    }
    const file = path === "/api/workout-draft" ? "current-workout.json" : path === "/api/next-workout" ? "next-workout.json" : null;
    if (file) {
      const decode = (text: string) => { if (!text.trim()) return null; const workout = JSON.parse(text); validateWorkout(workout); return workout; };
      if (method === "GET") return json(await store.snapshot(file, decode));
      if (method === "PUT" || method === "DELETE") {
        await store.check(file, expected);
        const value = method === "PUT" ? await payload() : null;
        if (method === "PUT") validateWorkout(value);
        await store.write(file, value === null ? "" : JSON.stringify(value));
        return json(await store.snapshot(file, decode));
      }
    }
    if (path === "/api/exercise-settings") {
      const decode = (text: string) => {
        const value = text ? JSON.parse(text) : { archivedExerciseNames: [] };
        if (!Array.isArray(value?.archivedExerciseNames) || value.archivedExerciseNames.some((name: unknown) => typeof name !== "string")) throw new Error("Exercise settings could not be read");
        return value;
      };
      if (method === "GET") return json(await store.snapshot("exercise-settings.json", decode));
      if (method === "PUT") {
        await store.check("exercise-settings.json", expected);
        const body = await payload();
        if (!Array.isArray(body?.archivedExerciseNames) || body.archivedExerciseNames.some((name: unknown) => typeof name !== "string")) throw new HttpError(400, "Expected exercise names");
        await store.write("exercise-settings.json", JSON.stringify({ archivedExerciseNames: [...new Set(body.archivedExerciseNames.map((name: string) => name.trim().toLowerCase()))].sort() }));
        return json(await store.snapshot("exercise-settings.json", decode));
      }
    }
    throw new HttpError(404, "Route not found");
  }).catch(error => new Response(error.message, { status: error instanceof HttpError ? error.status : 500 }));
}
