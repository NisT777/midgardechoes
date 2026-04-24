import { Bot, InlineKeyboard } from "grammy";
import { getCharacterByTelegramId, getInventoryWithItems, updateCharacterStats, getHpBar, getSpBar } from "../services/characterService";
import { getDb } from "../../queries/connection";
import { characters, inventoryItems, items } from "@db/schema";
import { eq } from "drizzle-orm";

export function registerInventoryHandler(bot: Bot) {
  // View inventory
  bot.callbackQuery("inv:view", async (ctx) => {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    const char = await getCharacterByTelegramId(telegramId);
    if (!char) return;

    const inv = await getInventoryWithItems(char.id);

    let text = `
🎒 <b>Инвентарь — ${char.name}</b>

${getHpBar(char.hp, char.maxHp)}
${getSpBar(char.sp, char.maxSp)}
💰 ${char.zeny}z

`;

    const keyboard = new InlineKeyboard();

    if (inv.length === 0) {
      text += "Инвентарь пуст.\n";
    } else {
      // Group by type
      const equipped = inv.filter((i) => i.equipped);
      const consumables = inv.filter((i) => !i.equipped && i.itemData.type === "consumable");
      const weapons = inv.filter((i) => !i.equipped && i.itemData.type === "weapon");
      const armors = inv.filter((i) => !i.equipped && i.itemData.type === "armor");
      const materials = inv.filter((i) => !i.equipped && i.itemData.type === "material");
      const cards = inv.filter((i) => !i.equipped && i.itemData.type === "card");
      const misc = inv.filter(
        (i) =>
          !i.equipped &&
          !["consumable", "weapon", "armor", "material", "card"].includes(i.itemData.type)
      );

      if (equipped.length > 0) {
        text += "<b>🛡️ Экипировка:</b>\n";
        for (const item of equipped) {
          text += `  [E] ${item.itemData.nameRu}\n`;
        }
        text += "\n";
      }

      if (weapons.length > 0) {
        text += "<b>⚔️ Оружие:</b>\n";
        for (const item of weapons) {
          text += `  ${item.itemData.nameRu} x${item.quantity}\n`;
          keyboard.text(`${item.itemData.nameRu}`, `inv:detail:${item.id}`);
          if (keyboard.inline_keyboard[keyboard.inline_keyboard.length - 1].length >= 2)
            keyboard.row();
        }
        text += "\n";
      }

      if (armors.length > 0) {
        text += "<b>🛡️ Броня:</b>\n";
        for (const item of armors) {
          text += `  ${item.itemData.nameRu} x${item.quantity}\n`;
          keyboard.text(`${item.itemData.nameRu}`, `inv:detail:${item.id}`);
          if (keyboard.inline_keyboard[keyboard.inline_keyboard.length - 1].length >= 2)
            keyboard.row();
        }
        text += "\n";
      }

      if (consumables.length > 0) {
        text += "<b>🧪 Расходники:</b>\n";
        for (const item of consumables) {
          text += `  ${item.itemData.nameRu} x${item.quantity}\n`;
          keyboard.text(`Исп. ${item.itemData.nameRu}`, `inv:use:${item.id}`);
          if (keyboard.inline_keyboard[keyboard.inline_keyboard.length - 1].length >= 2)
            keyboard.row();
        }
        text += "\n";
      }

      if (materials.length > 0) {
        text += "<b>📦 Материалы:</b>\n";
        for (const item of materials) {
          text += `  ${item.itemData.nameRu} x${item.quantity}\n`;
        }
        text += "\n";
      }

      if (cards.length > 0) {
        text += "<b>💎 Карты:</b>\n";
        for (const item of cards) {
          text += `  ${item.itemData.nameRu} x${item.quantity}\n`;
        }
        text += "\n";
      }

      if (misc.length > 0) {
        text += "<b>📎 Прочее:</b>\n";
        for (const item of misc) {
          text += `  ${item.itemData.nameRu} x${item.quantity}\n`;
        }
      }
    }

    keyboard.row();
    keyboard.text("🎮 Назад к игре", "game:explore");
    keyboard.text("🏠 Меню", "menu:main");

    await ctx.editMessageText(text, {
      reply_markup: keyboard,
      parse_mode: "HTML",
    });
    await ctx.answerCallbackQuery();
  });

  // Use consumable item
  bot.callbackQuery(/^inv:use:(\d+)$/, async (ctx) => {
    const itemId = parseInt(ctx.match[1]);
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    const char = await getCharacterByTelegramId(telegramId);
    if (!char) return;

    const inv = await getInventoryWithItems(char.id);
    const item = inv.find((i) => i.id === itemId);
    if (!item || item.quantity <= 0) {
      await ctx.answerCallbackQuery("Предмет не найден!");
      return;
    }

    if (item.itemData.type !== "consumable") {
      await ctx.answerCallbackQuery("Этот предмет нельзя использовать!");
      return;
    }

    if (char.inBattle) {
      await ctx.answerCallbackQuery("Используйте предметы в бою через меню боя!");
      return;
    }

    if (char.hp >= char.maxHp && (item.itemData.healHp || 0) > 0) {
      await ctx.answerCallbackQuery("HP уже полное!");
      return;
    }

    // Apply effect
    const newHp = Math.min(char.maxHp, char.hp + (item.itemData.healHp || 0));
    const newSp = Math.min(char.maxSp, char.sp + (item.itemData.healSp || 0));

    await updateCharacterStats(char.id, { hp: newHp, sp: newSp });

    // Consume item
    await getDb()
      .update(inventoryItems)
      .set({ quantity: item.quantity - 1 })
      .where(eq(inventoryItems.id, itemId));

    await ctx.answerCallbackQuery(
      `Использовано ${item.itemData.nameRu}: +${item.itemData.healHp || 0} HP`
    );

    // Refresh inventory view
    const keyboard = new InlineKeyboard().text("⬅️ Назад к инвентарю", "inv:view");
    await ctx.reply(`Использовано ${item.itemData.nameRu}: +${item.itemData.healHp || 0} HP`, { reply_markup: keyboard });
  });

  // Item detail
  bot.callbackQuery(/^inv:detail:(\d+)$/, async (ctx) => {
    const itemId = parseInt(ctx.match[1]);
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    const char = await getCharacterByTelegramId(telegramId);
    if (!char) return;

    const inv = await getInventoryWithItems(char.id);
    const item = inv.find((i) => i.id === itemId);
    if (!item) {
      await ctx.answerCallbackQuery("Предмет не найден!");
      return;
    }

    let text = `
📦 <b>${item.itemData.nameRu}</b>

${item.itemData.descriptionRu}

📊 <b>Характеристики:</b>
`;

    if (item.itemData.atk) text += `⚔️ ATK: ${item.itemData.atk}\n`;
    if (item.itemData.def) text += `🛡️ DEF: ${item.itemData.def}\n`;
    if (item.itemData.slots) text += `💠 Слоты: ${item.itemData.slots}\n`;
    if (item.itemData.equipLevel) text += `📊 Треб. уровень: ${item.itemData.equipLevel}\n`;
    if (item.itemData.weight) text += `⚖️ Вес: ${item.itemData.weight}\n`;
    if (item.itemData.healHp) text += `❤️ Лечение: +${item.itemData.healHp} HP\n`;

    text += `\n📦 Количество: ${item.quantity}\n`;

    const keyboard = new InlineKeyboard();

    if (item.itemData.type === "weapon" || item.itemData.type === "armor") {
      if (item.equipped) {
        keyboard.text("⬇️ Снять", `inv:unequip:${itemId}`);
      } else {
        keyboard.text("⬆️ Надеть", `inv:equip:${itemId}`);
      }
      keyboard.row();
    }

    keyboard.text("⬅️ Назад", "inv:view");

    await ctx.editMessageText(text, {
      reply_markup: keyboard,
      parse_mode: "HTML",
    });
    await ctx.answerCallbackQuery();
  });

  // Equip item
  bot.callbackQuery(/^inv:equip:(\d+)$/, async (ctx) => {
    const itemId = parseInt(ctx.match[1]);
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    const char = await getCharacterByTelegramId(telegramId);
    if (!char) return;

    const inv = await getInventoryWithItems(char.id);
    const item = inv.find((i) => i.id === itemId);
    if (!item) {
      await ctx.answerCallbackQuery("Предмет не найден!");
      return;
    }

    // Unequip current item of same type
    const equipSlot = getEquipSlot(item.itemData.type);
    if (!equipSlot) {
      await ctx.answerCallbackQuery("Нельзя экипировать этот предмет!");
      return;
    }

    // Unequip all items first
    const currentEquipped = inv.filter((i) => i.equipped);
    for (const equippedItem of currentEquipped) {
      if (getEquipSlot(equippedItem.itemData.type) === equipSlot) {
        await getDb()
          .update(inventoryItems)
          .set({ equipped: false })
          .where(eq(inventoryItems.id, equippedItem.id));
      }
    }

    // Equip new item
    await getDb()
      .update(inventoryItems)
      .set({ equipped: true })
      .where(eq(inventoryItems.id, itemId));

    await ctx.answerCallbackQuery(`Экипировано: ${item.itemData.nameRu}`);

    // Recalculate stats
    await recalculateEquipmentStats(char.id);

    // Refresh view
    ctx.callbackQuery.data = "inv:view";
  });

  // Unequip item
  bot.callbackQuery(/^inv:unequip:(\d+)$/, async (ctx) => {
    const itemId = parseInt(ctx.match[1]);

    await getDb()
      .update(inventoryItems)
      .set({ equipped: false })
      .where(eq(inventoryItems.id, itemId));

    await ctx.answerCallbackQuery("Предмет снят");

    const telegramId = ctx.from?.id;
    if (telegramId) {
      const char = await getCharacterByTelegramId(telegramId);
      if (char) await recalculateEquipmentStats(char.id);
    }
  });
}

function getEquipSlot(itemType: string): string | null {
  switch (itemType) {
    case "weapon": return "weapon";
    case "armor": return "armor";
    case "shield": return "shield";
    case "headgear": return "head";
    case "garment": return "garment";
    case "shoes": return "shoes";
    case "accessory": return "accessory";
    default: return null;
  }
}

async function recalculateEquipmentStats(charId: number) {
  const { getCharacterById, recalculateStats } = await import("../services/characterService");
  const char = await getCharacterById(charId);
  if (!char) return;

  const inv = await getInventoryWithItems(charId);
  const equipped = inv.filter((i) => i.equipped);

  let bonusAtk = 0;
  let bonusDef = 0;

  for (const item of equipped) {
    bonusAtk += item.itemData.atk || 0;
    bonusDef += item.itemData.def || 0;
  }

  const stats = recalculateStats({
    ...char,
    bonusAtk,
    bonusDef,
  } as any);

  await getDb()
    .update(characters)
    .set({
      atk: stats.atk + bonusAtk,
      def: stats.def + bonusDef,
      updatedAt: new Date(),
    })
    .where(eq(characters.id, charId));
}
