import { Bot, GrammyError, HttpError } from "grammy";
import { env } from "../lib/env";
import { registerStartHandler } from "./handlers/start";
import { registerGameHandler } from "./handlers/game";
import { registerCombatHandler } from "./handlers/combat";
import { registerInventoryHandler } from "./handlers/inventory";
import { registerCharacterHandler } from "./handlers/character";

const BOT_TOKEN = env.telegramBotToken || "";

export const bot = new Bot(BOT_TOKEN);

bot.catch((err) => {
  const ctx = err.ctx;
  console.error(`Error while handling update ${ctx.update.update_id}:`);
  const e = err.error;
  if (e instanceof GrammyError) {
    console.error("Error in request:", e.description);
  } else if (e instanceof HttpError) {
    console.error("Could not contact Telegram:", e);
  } else {
    console.error("Unknown error:", e);
  }
});

registerStartHandler(bot);
registerGameHandler(bot);
registerCombatHandler(bot);
registerInventoryHandler(bot);
registerCharacterHandler(bot);

console.log("🤖 Bot handlers registered");
