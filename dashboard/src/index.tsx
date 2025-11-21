import { serve } from "bun";
import index from "./index.html";
import { splitLinesByDate } from "../../src/parser";
import { Exercise } from "../../src/exercise";

const server = serve({
  routes: {
    // Serve index.html for all unmatched routes.
    "/*": index,

    "/api/exercises": async () => {
      try {
        const text = await Bun.file("../data/input.txt").text();
        const splitLines = splitLinesByDate(text);
        let exercises: Exercise[] = [];
        for (const [date, lines] of splitLines) {
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
