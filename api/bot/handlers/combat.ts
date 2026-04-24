import { Bot, InlineKeyboard } from "grammy";
import {
  getActiveBattle,
  playerAttack,
  monsterAttack,
  playerUseItem,
  playerFlee,
  getMonsterHpBar,
} from "../services/combatService";
import { getCharacterByTelegramId, getHpBar, getSpBar, getInventoryWithItems } from "../services/characterService";

export function registerCombatHandler(bot: Bot) {
  // Combat menu
  bot.callbackQuery("combat:menu", async (ctx) => {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    const char = await getCharacterByTelegramId(telegramId);
    if (!char) return;

    if (char.inBattle) {
      const battle = await getActiveBattle(char.id);
      if (battle) {
        await showBattleInterface(ctx, battle);
        return;
      }
    }

    // Not in battle - show nearby monsters
    const { getNearbyMonsters } = await import("../services/mapService");
    const monsters = await getNearbyMonsters(char.mapId, char.posX, char.posY, 3);

    let text = `
⚔️ <b>Боевая информация</b>

👤 ${char.name} | Lv.${char.baseLevel} ${char.jobClass.toUpperCase()}
⚔️ ATK: ${char.atk} | 🛡️ DEF: ${char.def}
🎯 Hit: ${char.hit} | 💨 Flee: ${char.flee}
💥 CRIT: ${char.crit}% | ⚡ ASPD: ${char.aspd}
`;

    const keyboard = new InlineKeyboard();

    if (monsters.length > 0) {
      text += "\n🐾 <b>Монстры рядом:</b>\n";
      for (const m of monsters.slice(0, 6)) {
        text += `${m.distance <= 1 ? "⚔️" : "👁️"} ${m.template.nameRu} Lv.${m.template.level} (${m.instance.x},${m.instance.y})\n`;
        if (m.distance <= 1) {
          keyboard.text(`⚔️ ${m.template.nameRu}`, `attack:${m.instance.id}`);
        }
      }
      if (keyboard.inline_keyboard.length > 0) keyboard.row();
    } else {
      text += "\n🐾 Рядом нет монстров. Попробуйте походить по карте.\n";
    }

    keyboard.text("⬅️ Назад", "game:explore");

    await ctx.editMessageText(text, {
      reply_markup: keyboard,
      parse_mode: "HTML",
    });
    await ctx.answerCallbackQuery();
  });

  // Player attacks
  bot.callbackQuery("combat:attack", async (ctx) => {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    const char = await getCharacterByTelegramId(telegramId);
    if (!char || !char.inBattle) {
      await ctx.answerCallbackQuery("Вы не в бою!");
      return;
    }

    const battle = await getActiveBattle(char.id);
    if (!battle || battle.turnOrder !== "player") {
      await ctx.answerCallbackQuery("Сейчас не ваш ход!");
      return;
    }

    const result = await playerAttack(battle.id);
    if (!result) {
      await ctx.answerCallbackQuery("Ошибка атаки!");
      return;
    }

    if (result.type === "battle_end") {
      await showBattleResult(ctx, result);
      return;
    }

    // Show result and monster turn
    await ctx.answerCallbackQuery(
      result.isMiss ? "Промах!" : result.isCrit ? `КРИТ! ${result.damage} урона!` : `${result.damage} урона`
    );

    // Monster turn
    const updatedBattle = await getActiveBattle(char.id);
    if (updatedBattle && updatedBattle.status === "active") {
      const monsterResult = await monsterAttack(updatedBattle.id);
      if (monsterResult) {
        if (monsterResult.type === "battle_end") {
          await showBattleResult(ctx, monsterResult);
          return;
        }
      }
    }

    // Show updated battle interface
    const finalBattle = await getActiveBattle(char.id);
    if (finalBattle) {
      await showBattleInterface(ctx, finalBattle);
    }
  });

  // Player flees
  bot.callbackQuery("combat:flee", async (ctx) => {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    const char = await getCharacterByTelegramId(telegramId);
    if (!char || !char.inBattle) {
      await ctx.answerCallbackQuery("Вы не в бою!");
      return;
    }

    const battle = await getActiveBattle(char.id);
    if (!battle) return;

    const result = await playerFlee(battle.id);
    if (!result) {
      await ctx.answerCallbackQuery("Ошибка!");
      return;
    }

    if (result.type === "battle_end") {
      await showBattleResult(ctx, result);
      return;
    }

    // Flee failed - monster attacks
    await ctx.answerCallbackQuery("Сбежать не удалось!");

    const monsterResult = await monsterAttack(battle.id);
    if (monsterResult && monsterResult.type === "battle_end") {
      await showBattleResult(ctx, monsterResult);
      return;
    }

    const updatedBattle = await getActiveBattle(char.id);
    if (updatedBattle) {
      await showBattleInterface(ctx, updatedBattle);
    }
  });

  // Show items in battle
  bot.callbackQuery("combat:items", async (ctx) => {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    const char = await getCharacterByTelegramId(telegramId);
    if (!char || !char.inBattle) {
      await ctx.answerCallbackQuery("Вы не в бою!");
      return;
    }

    const inv = await getInventoryWithItems(char.id);
    const consumables = inv.filter((i) => i.itemData.type === "consumable" && i.quantity > 0);

    if (consumables.length === 0) {
      await ctx.answerCallbackQuery("Нет предметов для использования!");
      return;
    }

    let text = "🎒 <b>Выберите предмет:</b>\n\n";
    const keyboard = new InlineKeyboard();

    for (const item of consumables.slice(0, 8)) {
      text += `• ${item.itemData.nameRu} x${item.quantity} (+${item.itemData.healHp || 0} HP)\n`;
      keyboard.text(
        `${item.itemData.nameRu} x${item.quantity}`,
        `combat:use:${item.itemId}`
      );
      if (keyboard.inline_keyboard[keyboard.inline_keyboard.length - 1].length >= 2) {
        keyboard.row();
      }
    }

    keyboard.row();
    keyboard.text("⬅️ Назад", "combat:menu");

    await ctx.editMessageText(text, {
      reply_markup: keyboard,
      parse_mode: "HTML",
    });
    await ctx.answerCallbackQuery();
  });

  // Use item in battle
  bot.callbackQuery(/^combat:use:(.+)$/, async (ctx) => {
    const itemId = ctx.match[1];
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    const char = await getCharacterByTelegramId(telegramId);
    if (!char || !char.inBattle) {
      await ctx.answerCallbackQuery("Вы не в бою!");
      return;
    }

    const battle = await getActiveBattle(char.id);
    if (!battle || battle.turnOrder !== "player") {
      await ctx.answerCallbackQuery("Сейчас не ваш ход!");
      return;
    }

    const result = await playerUseItem(battle.id, itemId);
    if (!result) {
      await ctx.answerCallbackQuery("Ошибка!");
      return;
    }

    if (result.type === "error") {
      await ctx.answerCallbackQuery(result.message);
      return;
    }

    await ctx.answerCallbackQuery(`Использовано: ${result.itemName}`);

    // Monster turn
    const monsterResult = await monsterAttack(battle.id);
    if (monsterResult && monsterResult.type === "battle_end") {
      await showBattleResult(ctx, monsterResult);
      return;
    }

    const updatedBattle = await getActiveBattle(char.id);
    if (updatedBattle) {
      await showBattleInterface(ctx, updatedBattle);
    }
  });
}

async function showBattleInterface(ctx: any, battle: any) {
  const telegramId = ctx.from?.id;
  const char = await getCharacterByTelegramId(telegramId);
  if (!char) return;

  const battleText = `
⚔️ <b>БОЙ — Ход ${battle.currentTurn}</b>

👤 <b>${char.name}</b> Lv.${char.baseLevel}
${getHpBar(battle.playerHp, char.maxHp)}
${getSpBar(battle.playerSp, char.maxSp)}

🐾 <b>${battle.monsterName}</b> Lv.${battle.monsterLevel}
${getMonsterHpBar(battle.monsterHp, battle.monsterMaxHp)}
💧 ${battle.monsterElement} | 🏷️ ${battle.monsterRace} | 📐 ${battle.monsterSize}

🎭 <b>Сейчас ходит:</b> ${battle.turnOrder === "player" ? "ВЫ" : "МОНСТР"}
`;

  const keyboard = new InlineKeyboard();

  if (battle.turnOrder === "player") {
    keyboard.text("⚔️ Атаковать", "combat:attack");
    keyboard.text("🎒 Предмет", "combat:items");
    keyboard.row();
    keyboard.text("🏃 Сбежать", "combat:flee");
  } else {
    keyboard.text("⏳ Ожидание хода монстра...", "noop");
    keyboard.row();
    keyboard.text("🔄 Обновить", "combat:menu");
  }

  await ctx.editMessageText(battleText, {
    reply_markup: keyboard,
    parse_mode: "HTML",
  });
}

async function showBattleResult(ctx: any, result: any) {
  let text = "";
  const keyboard = new InlineKeyboard();

  if (result.outcome === "won") {
    text = `
🎉 <b>ПОБЕДА!</b>

⭐ +${result.expGained} Base EXP
⭐ +${result.jobExpGained} Job EXP
💰 +${result.zenyGained} Zeny
`;

    if (result.drops && result.drops.length > 0) {
      text += "\n📦 <b>Добыча:</b>\n";
      for (const drop of result.drops) {
        const emoji = drop.isCard ? "💎" : "📦";
        text += `${emoji} ${drop.itemName} x${drop.quantity}\n`;
      }
    }

    if (result.leveledUp) {
      text += "\n🆙 <b>LEVEL UP!</b> Поздравляем!\n";
    }

    keyboard.text("🎮 Продолжить", "game:explore");
    keyboard.text("📊 Персонаж", "char:view");
  } else if (result.outcome === "lost") {
    text = `
💀 <b>ВЫ ПАЛИ В БОЮ</b>

📉 Потеряно: ${result.expLost} EXP
🏚️ Вас телепортировали в город
`;
    keyboard.text("🎮 Продолжить", "game:explore");
  } else {
    text = `
🏃 <b>ВЫ СБЕЖАЛИ</b>

Удачный побег! Монстр остался позади.
`;
    keyboard.text("🎮 Продолжить", "game:explore");
  }

  await ctx.editMessageText(text, {
    reply_markup: keyboard,
    parse_mode: "HTML",
  });
  await ctx.answerCallbackQuery();
}
