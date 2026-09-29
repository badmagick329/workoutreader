import { serve } from "bun";
import index from "./index.html";
import { createApi } from "./server/api";
const api = createApi(process.env.DATA_DIR ?? "../data");
// The web manifest is copied verbatim by the HTML bundler, so the icons it names need stable URLs.
const icon = (size: number) => new Response(Bun.file(new URL(`./icons/icon-${size}.png`, import.meta.url)), { headers: { "Cache-Control": "public, max-age=86400" } });
const server = serve({
  hostname: process.env.APP_HOST ?? "127.0.0.1",
  port: Number(process.env.APP_PORT ?? "3000"),
  routes: {
    "/api/*": api,
    "/icons/icon-192.png": () => icon(192),
    "/icons/icon-512.png": () => icon(512),
    "/*": index,
  },
  development: process.env.NODE_ENV !== "production" && { hmr: true, console: true },
});
console.log(`Server running at ${server.url}`);
