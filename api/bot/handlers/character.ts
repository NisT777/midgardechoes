import { Bot, InlineKeyboard } from "grammy";
import { getCharacterByTelegramId, getHpBar, getSpBar, getExpBar, allocateStat } from "../services/characterService";

export function registerCharacterHandler(bot: Bot) {
  // View character
  bot.callbackQuery("char:view", async (ctx) => {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    const char = await getCharacterByTelegramId(telegramId);
    if (!char) return;

    const text = `
📊 <b>${char.name}</b>
━━━━━━━━━━━━━━━━━━━━━
🏆 <b>Класс:</b> ${getJobClassName(char.jobClass)}
📈 <b>Базовый уровень:</b> ${char.baseLevel}
📈 <b>Job Level:</b> ${char.jobLevel}

${getHpBar(char.hp, char.maxHp)}
${getSpBar(char.sp, char.maxSp)}

⭐ <b>EXP:</b> ${getExpBar(char.baseExp, char.baseLevel)}
⭐ <b>Job EXP:</b> ${char.jobExp}

<b>⚔️ Боевые характеристики:</b>
⚔️ ATK: ${char.atk}
🛡️ DEF: ${char.def}
🔮 MATK: ${char.matk}
🛡️ MDEF: ${char.mdef}
🎯 Hit: ${char.hit}
💨 Flee: ${char.flee}
💥 CRIT: ${char.crit}%
⚡ ASPD: ${char.aspd}

<b>📊 Статы (очки: ${char.statPoints}):</b>
💪 STR: ${char.baseStr} ${char.bonusStr > 0 ? `(+${char.bonusStr})` : ""}
💨 AGI: ${char.baseAgi} ${char.bonusAgi > 0 ? `(+${char.bonusAgi})` : ""}
❤️ VIT: ${char.baseVit} ${char.bonusVit > 0 ? `(+${char.bonusVit})` : ""}
🔮 INT: ${char.baseInt} ${char.bonusInt > 0 ? `(+${char.bonusInt})` : ""}
🎯 DEX: ${char.baseDex} ${char.bonusDex > 0 ? `(+${char.bonusDex})` : ""}
🍀 LUK: ${char.baseLuk} ${char.bonusLuk > 0 ? `(+${char.bonusLuk})` : ""}

<b>💰 Экономика:</b>
💰 Zeny: ${char.zeny.toLocaleString()}z
💎 Kafra Points: ${char.kafraPoints}

<b>📈 Статистика:</b>
⚔️ Убийств: ${char.totalKills}
💀 Смертей: ${char.totalDeaths}
`;

    const keyboard = new InlineKeyboard();

    // Stat allocation buttons
    if (char.statPoints > 0) {
      keyboard.text(`💪 STR +1 (${char.statPoints} очков)`, "stat:str");
      keyboard.text(`💨 AGI +1`, "stat:agi");
      keyboard.row();
      keyboard.text(`❤️ VIT +1`, "stat:vit");
      keyboard.text(`🔮 INT +1`, "stat:int");
      keyboard.row();
      keyboard.text(`🎯 DEX +1`, "stat:dex");
      keyboard.text(`🍀 LUK +1`, "stat:luk");
      keyboard.row();
    }

    keyboard.text("🎒 Инвентарь", "inv:view");
    keyboard.text("🎮 Играть", "game:explore");
    keyboard.row();
    keyboard.text("🏠 Меню", "menu:main");

    await ctx.editMessageText(text, {
      reply_markup: keyboard,
      parse_mode: "HTML",
    });
    await ctx.answerCallbackQuery();
  });

  // Allocate stat
  bot.callbackQuery(/^stat:(\w+)$/, async (ctx) => {
    const stat = ctx.match[1] as "str" | "agi" | "vit" | "int" | "dex" | "luk";
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    const char = await getCharacterByTelegramId(telegramId);
    if (!char) {
      await ctx.answerCallbackQuery("Персонаж не найден!");
      return;
    }

    if (char.statPoints <= 0) {
      await ctx.answerCallbackQuery("Нет свободных очков характеристик!");
      return;
    }

    const result = await allocateStat(char.id, stat);
    if (!result) {
      await ctx.answerCallbackQuery("Ошибка распределения!");
      return;
    }

    const statNames: Record<string, string> = {
      str: "💪 STR",
      agi: "💨 AGI",
      vit: "❤️ VIT",
      int: "🔮 INT",
      dex: "🎯 DEX",
      luk: "🍀 LUK",
    };

    await ctx.answerCallbackQuery(`${statNames[stat]} увеличена! Осталось очков: ${result.statPoints}`);

    // Refresh character view
    ctx.callbackQuery.data = "char:view";
    await registerCharacterHandler(bot);
  });
}

function getJobClassName(jobClass: string): string {
  const names: Record<string, string> = {
    novice: "Новичок (Novice)",
    swordsman: "Мечник (Swordsman)",
    mage: "Маг (Mage)",
    archer: "Лучник (Archer)",
    acolyte: "Аколит (Acolyte)",
    thief: "Вор (Thief)",
    merchant: "Торговец (Merchant)",
  };
  return names[jobClass] || jobClass;
}
