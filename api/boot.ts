import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import type { HttpBindings } from "@hono/node-server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router";
import { createContext } from "./context";
import { env } from "./lib/env";

const app = new Hono<{ Bindings: HttpBindings }>();

app.use(bodyLimit({ maxSize: 50 * 1024 * 1024 }));
app.use("/api/trpc/*", async (c) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext,
  });
});

// Serve static images
app.use("/images/*", async (c) => {
  const path = c.req.path;
  const filePath = `./public${path}`;
  try {
    const file = await import("node:fs").then((fs) => fs.readFileSync(filePath));
    const ext = path.split(".").pop();
    const contentType = ext === "png" ? "image/png" : ext === "jpg" || ext === "jpeg" ? "image/jpeg" : "application/octet-stream";
    return new Response(file, { headers: { "Content-Type": contentType } });
  } catch {
    return c.json({ error: "Not Found" }, 404);
  }
});

app.all("/api/*", (c) => c.json({ error: "Not Found" }, 404));

export default app;

// Start Telegram Bot
if (env.telegramBotToken) {
  import("./bot/bot").then(({ startBot }) => {
    startBot();
  }).catch((err) => {
    console.error("Failed to start bot:", err);
  });
}

if (env.isProduction) {
  const { serve } = await import("@hono/node-server");
  const { serveStaticFiles } = await import("./lib/vite");
  serveStaticFiles(app);

  const port = parseInt(process.env.PORT || "3000");
  serve({ fetch: app.fetch, port }, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}
