import { serve } from "bun";
import index from "./index.html";
import { splitLinesByDate } from "../../src/parser";
import { Exercise } from "../../src/exercise";

type ExerciseSettings = {
  archivedExerciseNames: string[];
};

const dataDir = process.env.DATA_DIR ?? "../data";
const inputPath = `${dataDir}/input.txt`;
const draftPath = `${dataDir}/current-workout.json`;
const settingsPath = `${dataDir}/exercise-settings.json`;
const host = process.env.APP_HOST ?? "0.0.0.0";
const port = Number(process.env.APP_PORT ?? "3000");
const maxWorkoutInputBytes = 1_000_000;

type Workout = { date: string; lines: string[] };

function getWorkouts(text: string): Workout[] {
  const workouts: Workout[] = [];
  let workout: Workout | null = null;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    if (/^\d{6}$/.test(line)) {
      if (workout) workouts.push(workout);
      workout = { date: line, lines: [] };
    } else if (workout) {
      workout.lines.push(line);
    } else {
      throw new Error(`Workout text found without a date\n${line}`);
    }
  }
  if (workout) workouts.push(workout);
  return workouts;
}

function validateWorkout(workout: Workout): void {
  if (!/^\d{6}$/.test(workout.date) || !Array.isArray(workout.lines)) {
    throw new Error("Workout date or exercises are invalid");
  }
  parseExercises([workout.date, ...workout.lines].join("\n"));
}

function serializeWorkouts(workouts: Workout[]): string {
  return workouts.flatMap((workout) => [workout.date, ...workout.lines, ""]).join("\n").trimEnd() + "\n";
}

async function readDraft(): Promise<Workout | null> {
  const file = Bun.file(draftPath);
  if (!(await file.exists())) return null;
  const text = await file.text();
  if (!text.trim()) return null;
  const draft = JSON.parse(text) as Workout;
  validateWorkout(draft);
  return draft;
}

function parseExercises(text: string): Exercise[] {
  const splitLines = splitLinesByDate(text);
  let exercises: Exercise[] = [];
  for (const [date, lines] of splitLines) {
    for (const line of lines) {
      exercises = exercises.concat(Exercise.fromLine(date, line));
    }
  }
  return exercises;
}

function normalizeExerciseNames(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .filter((name): name is string => typeof name === "string")
        .map((name) => name.trim().toLowerCase())
        .filter(Boolean),
    ),
  ).sort();
}

async function readExerciseSettings(): Promise<ExerciseSettings> {
  const file = Bun.file(settingsPath);
  if (!(await file.exists())) return { archivedExerciseNames: [] };

  try {
    const parsed = (await file.json()) as Partial<ExerciseSettings>;
    return { archivedExerciseNames: normalizeExerciseNames(parsed.archivedExerciseNames) };
  } catch {
    return { archivedExerciseNames: [] };
  }
}

const server = serve({
  hostname: host,
  port,
  routes: {
    // Serve index.html for all unmatched routes.
    "/*": index,

    "/api/exercises": async () => {
      try {
        const text = await Bun.file(inputPath).text();
        return Response.json(parseExercises(text));
      } catch (e) {
        console.error(e);
        return new Response("Error parsing data", { status: 500 });
      }
    },

    "/api/workout-input": {
      async GET() {
        try {
          return new Response(await Bun.file(inputPath).text(), {
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          });
        } catch (error) {
          console.error(error);
          return new Response("Workout input could not be read", { status: 500 });
        }
      },
      async PUT(req) {
        let text: unknown;
        try {
          ({ text } = (await req.json()) as { text?: unknown });
        } catch {
          return new Response("Workout input must be valid JSON", { status: 400 });
        }

        if (typeof text !== "string") {
          return new Response("Workout input must be text", { status: 400 });
        }
        if (new TextEncoder().encode(text).byteLength > maxWorkoutInputBytes) {
          return new Response("Workout input is too large", { status: 413 });
        }

        try {
          parseExercises(text);
        } catch (error) {
          return new Response(
            error instanceof Error ? error.message : "Workout input is invalid",
            { status: 400 },
          );
        }

        try {
          await Bun.write(inputPath, text);
          return Response.json({ text });
        } catch (error) {
          console.error(error);
          return new Response("Workout input could not be saved", { status: 500 });
        }
      },
    },

    "/api/exercise-settings": {
      async GET() {
        return Response.json(await readExerciseSettings());
      },
      async PUT(req) {
        try {
          const payload = (await req.json()) as Partial<ExerciseSettings>;
          const settings = {
            archivedExerciseNames: normalizeExerciseNames(payload.archivedExerciseNames),
          };
          await Bun.write(settingsPath, `${JSON.stringify(settings, null, 2)}\n`);
          return Response.json(settings);
        } catch {
          return new Response("Invalid exercise settings", { status: 400 });
        }
      },
    },

    "/api/workouts": async () => {
      try {
        const workouts = getWorkouts(await Bun.file(inputPath).text());
        return Response.json(workouts.toReversed());
      } catch (error) {
        console.error(error);
        return new Response("Workouts could not be loaded", { status: 500 });
      }
    },

    "/api/workout-draft": {
      async GET() {
        try {
          return Response.json(await readDraft());
        } catch (error) {
          console.error(error);
          return new Response("Workout draft could not be loaded", { status: 500 });
        }
      },
      async PUT(req) {
        try {
          const draft = (await req.json()) as Workout;
          validateWorkout(draft);
          await Bun.write(draftPath, `${JSON.stringify(draft, null, 2)}\n`);
          return Response.json(draft);
        } catch (error) {
          return new Response(error instanceof Error ? error.message : "Workout draft is invalid", { status: 400 });
        }
      },
      async DELETE() {
        try {
          await Bun.write(draftPath, "");
          return new Response(null, { status: 204 });
        } catch (error) {
          console.error(error);
          return new Response("Workout draft could not be cleared", { status: 500 });
        }
      },
    },

    "/api/workout-draft/finish": {
      async POST(req) {
        try {
          const draft = await readDraft();
          if (!draft) return new Response("No active workout draft", { status: 404 });
          const payload = (await req.json()) as { conflict?: "merge" | "overwrite" };
          const workouts = getWorkouts(await Bun.file(inputPath).text());
          const matching = workouts.findIndex((workout) => workout.date === draft.date);
          if (matching >= 0 && !payload.conflict) {
            return Response.json({ conflict: true, existing: workouts[matching] }, { status: 409 });
          }
          if (matching >= 0 && payload.conflict === "overwrite") workouts[matching] = draft;
          else if (matching >= 0 && payload.conflict === "merge") workouts[matching] = { ...workouts[matching], lines: [...workouts[matching].lines, ...draft.lines] };
          else workouts.push(draft);
          await Bun.write(inputPath, serializeWorkouts(workouts));
          await Bun.write(draftPath, "");
          return Response.json({ workout: draft });
        } catch (error) {
          console.error(error);
          return new Response("Workout could not be finished", { status: 500 });
        }
      },
    },

    "/api/hello": {
      async GET(req) {
        return Response.json({
          message: "Hello, world!",
          method: "GET",
        });
      },
      async PUT(req) {
        return Response.json({
          message: "Hello, world!",
          method: "PUT",
        });
      },
    },

    "/api/hello/:name": async (req) => {
      const name = req.params.name;
      return Response.json({
        message: `Hello, ${name}!`,
      });
    },
  },

  development: process.env.NODE_ENV !== "production" && {
    // Enable browser hot reloading in development
    hmr: true,

    // Echo console logs from the browser to the server
    console: true,
  },
});

console.log(`🚀 Server running at ${server.url}`);
