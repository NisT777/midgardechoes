import "dotenv/config";
import { bot } from "./bot";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { webhookCallback } from "grammy";

const app = new Hono();

app.get("/", (c) => c.text("Midgard Echoes Bot is running! 🤖"));
app.get("/health", (c) => c.json({ status: "ok", bot: "running" }));
app.post("/api/bot/webhook", webhookCallback(bot, "hono"));

const port = parseInt(process.env.PORT || "3000");

serve({ fetch: app.fetch, port }, async () => {
  console.log(`🌐 Web server running on port ${port}`);

  const renderHost = process.env.RENDER_EXTERNAL_HOSTNAME;
  if (renderHost) {
    const webhookUrl = `https://${renderHost}/api/bot/webhook`;
    try {
      await bot.api.setWebhook(webhookUrl);
      console.log(`✅ Webhook set: ${webhookUrl}`);
    } catch (err) {
      console.error("❌ Webhook failed:", err);
    }
  } else {
    console.log("⚠️ No RENDER_EXTERNAL_HOSTNAME");
  }
});
