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
const hostname