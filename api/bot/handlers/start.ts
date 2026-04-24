import { Bot, InlineKeyboard } from "grammy";
import { getOrCreateCharacter, getCharacterByTelegramId } from "../services/characterService";
import { spawnMonstersForMap } from "../services/mapService";

export function registerStartHandler(bot: Bot) {
  // /start command
  bot.command("start", async (ctx) => {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    const char = await getOrCreateCharacter(telegramId, ctx.from?.username);
    if (!char) {
      await ctx.reply("Ошибка создания персонажа. Попробуйте позже.");
      return;
    }

    // Spawn monsters on current map
    await spawnMonstersForMap(char.mapId);

    // Title screen
    const titleText = `
╔══════════════════════════════════════╗
║           🌟 MIDGARD ECHOES 🌟         ║
║                                      ║
║      Ваше приключение начинается!    ║
║                                      ║
╚══════════════════════════════════════╝

👤 ${char.name} | Lv.${char.baseLevel} ${char.jobClass.toUpperCase()}
❤️ HP: ${char.hp}/${char.maxHp} | 💙 SP: ${char.sp}/${char.maxSp}
💰 Zeny: ${char.zeny}z

Добро пожаловать в Midgard Echoes — текстовую MMORPG, вдохновлённую легендарной Ragnarok Online!

Исследуйте мир, сражайтесь с монстрами, находите редкие карты и становитесь легендой!
`;

    const keyboard = new InlineKeyboard()
      .text("🎮 Играть", "game:explore")
      .text("📊 Персонаж", "char:view")
      .row()
      .text("🎒 Инвентарь", "inv:view")
      .text("⚔️ Бой", "combat:menu")
      .row()
      .text("❓ Помощь", "help")
      .text("⚙️ Настройки", "settings");

    await ctx.reply(titleText, {
      reply_markup: keyboard,
      parse_mode: "HTML",
    });
  });

  // Help
  bot.callbackQuery("help", async (ctx) => {
    const helpText = `
📖 <b>Помощь по Midgard Echoes</b>

<b>Основные команды:</b>
/start — Главное меню
/explore — Исследовать локацию
/char — Персонаж
/inv — Инвентарь
/battle — Боевая информация

<b>Управление:</b>
⬆️⬇️⬅️➡️ — Перемещение
⚔️ — Атаковать монстра
🎒 — Использовать предмет
🏃 — Попытаться сбежать
🧘 — Сесть (регенерация)

<b>Советы:</b>
• Убивайте Порингов для начала — они самые слабые
• Собирайте Желлопи и продавайте торговцам
• Карты падают с шансом 0.02% — это очень редко!
• При смерти вы теряете 1% EXP и телепортируетесь в город

<b>Элементы:</b>
🟢 Вода > 🔥 Огонь > 🌪️ Ветер > 🟤 Земля > 🟢 Вода
`;

    const keyboard = new InlineKeyboard().text("⬅️ Назад", "menu:main");

    await ctx.editMessageText(helpText, {
      reply_markup: keyboard,
      parse_mode: "HTML",
    });
    await ctx.answerCallbackQuery();
  });

  // Settings
  bot.callbackQuery("settings", async (ctx) => {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    const char = await getCharacterByTelegramId(telegramId);
    if (!char) return;

    const settingsText = `
⚙️ <b>Настройки</b>

🌐 Язык: ${char.language === "ru" ? "Русский 🇷🇺" : "English 🇬🇧"}
💬 Чат: ${char.chatEnabled ? "✅ Включён" : "❌ Выключен"}
🗺️ Мини-карта: ${char.showMinimap ? "✅ Показывать" : "❌ Скрыть"}
`;

    const keyboard = new InlineKeyboard()
      .text(char.language === "ru" ? "🇬🇧 English" : "🇷🇺 Русский", "settings:lang")
      .row()
      .text(char.chatEnabled ? "🔇 Выключить чат" : "🔊 Включить чат", "settings:chat")
      .row()
      .text("⬅️ Назад", "menu:main");

    await ctx.editMessageText(settingsText, {
      reply_markup: keyboard,
      parse_mode: "HTML",
    });
    await ctx.answerCallbackQuery();
  });

  // Toggle language
  bot.callbackQuery("settings:lang", async (ctx) => {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    const char = await getCharacterByTelegramId(telegramId);
    if (!char) return;

    const { getDb } = require("../../queries/connection");
    const { characters } = require("@db/schema");
    const { eq } = require("drizzle-orm");

    await getDb()
      .update(characters)
      .set({ language: char.language === "ru" ? "en" : "ru" })
      .where(eq(characters.id, char.id));

    await ctx.answerCallbackQuery(
      char.language === "ru" ? "Language changed to English" : "Язык изменён на Русский"
    );

    // Refresh settings by showing updated settings
    const settingsText2 = `
⚙️ <b>Настройки</b>

🌐 Язык: ${char.language === "ru" ? "English 🇬🇧" : "Русский 🇷🇺"}
💬 Чат: ${!char.chatEnabled ? "✅ Включён" : "❌ Выключен"}
🗺️ Мини-карта: ${char.showMinimap ? "✅ Показывать" : "❌ Скрыть"}
`;

    const keyboard2 = new InlineKeyboard()
      .text(char.language === "ru" ? "🇷🇺 Русский" : "🇬🇧 English", "settings:lang")
      .row()
      .text(!char.chatEnabled ? "🔇 Выключить чат" : "🔊 Включить чат", "settings:chat")
      .row()
      .text("⬅️ Назад", "menu:main");

    await ctx.editMessageText(settingsText2, {
      reply_markup: keyboard2,
      parse_mode: "HTML",
    });
  });

  // Toggle chat
  bot.callbackQuery("settings:chat", async (ctx) => {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    const char = await getCharacterByTelegramId(telegramId);
    if (!char) return;

    const { getDb } = require("../../queries/connection");
    const { characters } = require("@db/schema");
    const { eq } = require("drizzle-orm");

    await getDb()
      .update(characters)
      .set({ chatEnabled: !char.chatEnabled })
      .where(eq(characters.id, char.id));

    await ctx.answerCallbackQuery(
      !char.chatEnabled ? "Чат включён" : "Чат выключен"
    );
  });

  // Back to main menu
  bot.callbackQuery("menu:main", async (ctx) => {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    const char = await getCharacterByTelegramId(telegramId);
    if (!char) return;

    const titleText = `
╔══════════════════════════════════════╗
║           🌟 MIDGARD ECHOES 🌟         ║
╚══════════════════════════════════════╝

👤 ${char.name} | Lv.${char.baseLevel} ${char.jobClass.toUpperCase()}
❤️ HP: ${char.hp}/${char.maxHp} | 💙 SP: ${char.sp}/${char.maxSp}
💰 Zeny: ${char.zeny}z

Выберите действие:
`;

    const keyboard = new InlineKeyboard()
      .text("🎮 Играть", "game:explore")
      .text("📊 Персонаж", "char:view")
      .row()
      .text("🎒 Инвентарь", "inv:view")
      .text("⚔️ Бой", "combat:menu")
      .row()
      .text("❓ Помощь", "help")
      .text("⚙️ Настройки", "settings");

    await ctx.editMessageText(titleText, {
      reply_markup: keyboard,
      parse_mode: "HTML",
    });
    await ctx.answerCallbackQuery();
  });
}
