import { serve } from "bun";
import index from "./index.html";
import { createApi } from "./server/api";
const api = createApi(process.env.DATA_DIR ?? "../data");
const server = serve({
  hostname: process.env.APP_HOST ?? "0.0.0.0",
  port: Number(process.env.APP_PORT ?? "3000"),
  routes: { "/api/*": api, "/*": index },
  development: process.env.NODE_ENV !== "production" && { hmr: true, console: true },
});
console.log(`Server running at ${server.url}`);
