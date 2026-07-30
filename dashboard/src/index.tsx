import { serve } from "bun";
import index from "./index.html";
import { splitLinesByDate } from "../../src/parser";
import { Exercise } from "../../src/exercise";

const dataDir = process.env.DATA_DIR ?? "../data";
const inputPath = `${dataDir}/input.txt`;
const host = process.env.APP_HOST ?? "0.0.0.0";
const port = Number(process.env.APP_PORT ?? "3000");

const maxWorkoutInputBytes = 1_000_000;

function validateWorkoutInput(text: string): void {
  const splitLines = splitLinesByDate(text);
  for (const [date, lines] of splitLines) {
    for (const line of lines) Exercise.fromLine(date, line);
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
        const splitLines = splitLinesByDate(text);
        let exercises: Exercise[] = [];
        for (const [date, lines] of Array.from(splitLines)) {
          for (const line of lines) {
            const result = Exercise.fromLine(date, line);
            exercises = exercises.concat(result);
          }
        }
        return Response.json(exercises);
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
        if (typeof text !== "string") return new Response("Workout input must be text", { status: 400 });
        if (new TextEncoder().encode(text).byteLength > maxWorkoutInputBytes) {
          return new Response("Workout input is too large", { status: 413 });
        }
        try {
          validateWorkoutInput(text);
        } catch (error) {
          return new Response(error instanceof Error ? error.message : "Workout input is invalid", { status: 400 });
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
