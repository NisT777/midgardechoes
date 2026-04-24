import { Bot, InlineKeyboard } from "grammy";
import { getCharacterByTelegramId, updateCharacterPosition, updateCharacterHpSp, getHpBar, getSpBar } from "../services/characterService";
import {
  formatMinimap,
  getExits,
  getNearbyMonsters,
  getNearbyNpcs,
  getNpcsAtPosition,
  canWalk,
  getTransitionAt,
  getTile,
  getTileName,
  spawnMonstersForMap,
  getMap,
} from "../services/mapService";
import { startBattle } from "../services/combatService";

export function registerGameHandler(bot: Bot) {
  // Explore / Main game view
  bot.callbackQuery("game:explore", async (ctx) => {
    await showGameView(ctx);
  });

  // Movement handlers
  bot.callbackQuery(/^move:(.+)$/, async (ctx) => {
    const direction = ctx.match[1];
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    const char = await getCharacterByTelegramId(telegramId);
    if (!char || char.inBattle || char.isDead) {
      await ctx.answerCallbackQuery(char?.inBattle ? "Вы в бою!" : "Вы не можете двигаться!");
      return;
    }

    let dx = 0, dy = 0;
    switch (direction) {
      case "north": dy = -1; break;
      case "south": dy = 1; break;
      case "west": dx = -1; break;
      case "east": dx = 1; break;
      default: return;
    }

    const newX = char.posX + dx;
    const newY = char.posY + dy;

    // Check transition
    const transition = await getTransitionAt(char.mapId, newX, newY);
    if (transition) {
      await updateCharacterPosition(char.id, transition.toMap, transition.toX, transition.toY);
      await spawnMonstersForMap(transition.toMap);
      await ctx.answerCallbackQuery("Переход...");
      await showGameView(ctx);
      return;
    }

    // Check if walkable
    if (!(await canWalk(char.mapId, newX, newY))) {
      await ctx.answerCallbackQuery("Туда нельзя пройти!");
      return;
    }

    // Move
    await updateCharacterPosition(char.id, char.mapId, newX, newY);

    // Check for monsters at new position
    const { getMonstersAtPosition } = await import("../services/mapService");
    const monstersHere = await getMonstersAtPosition(char.mapId, newX, newY);

    if (monstersHere.length > 0) {
      // Auto-engage or show
      await ctx.answerCallbackQuery(`Вы встретили ${monstersHere[0].template.nameRu}!`);
    } else {
      await ctx.answerCallbackQuery();
    }

    await showGameView(ctx);
  });

  // Sit / Stand
  bot.callbackQuery("action:sit", async (ctx) => {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    const char = await getCharacterByTelegramId(telegramId);
    if (!char || char.inBattle) {
      await ctx.answerCallbackQuery("Нельзя сесть в бою!");
      return;
    }

    const { getDb } = await import("../../queries/connection");
    const { characters } = await import("@db/schema");
    const { eq } = await import("drizzle-orm");

    if (char.isSitting) {
      // Stand up
      await getDb()
        .update(characters)
        .set({ isSitting: false })
        .where(eq(characters.id, char.id));
      await ctx.answerCallbackQuery("Вы встали");
    } else {
      // Sit down
      const regenHp = Math.floor(char.maxHp * 0.03);
      const regenSp = Math.floor(char.maxSp * 0.03);
      const newHp = Math.min(char.maxHp, char.hp + regenHp);
      const newSp = Math.min(char.maxSp, char.sp + regenSp);

      await getDb()
        .update(characters)
        .set({ isSitting: true, hp: newHp, sp: newSp })
        .where(eq(characters.id, char.id));

      await ctx.answerCallbackQuery(`+${regenHp} HP, +${regenSp} SP (регенерация)`);
    }

    await showGameView(ctx);
  });

  // Attack monster on current tile
  bot.callbackQuery(/^attack:(\d+)$/, async (ctx) => {
    const monsterInstanceId = parseInt(ctx.match[1]);
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    const char = await getCharacterByTelegramId(telegramId);
    if (!char || char.inBattle) {
      await ctx.answerCallbackQuery("Вы уже в бою!");
      return;
    }

    const result = await startBattle(char.id, monsterInstanceId);
    if (!result) {
      await ctx.answerCallbackQuery("Не удалось начать бой!");
      return;
    }

    await ctx.answerCallbackQuery("Бой начался!");
    await showBattleView(ctx, result.battle!, result.firstTurn as string);
  });

  // Talk to NPC
  bot.callbackQuery(/^npc:talk:(\d+)$/, async (ctx) => {
    const npcId = parseInt(ctx.match[1]);
    await ctx.answerCallbackQuery("NPC диалог — в разработке");
  });

  // Show minimap
  bot.callbackQuery("game:minimap", async (ctx) => {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    const char = await getCharacterByTelegramId(telegramId);
    if (!char) return;

    const minimap = await formatMinimap(char.mapId, char.posX, char.posY, 4);
    const mapData = await getMap(char.mapId);

    const minimapText = `
🗺️ <b>${mapData?.nameRu || char.mapId}</b>
📍 (${char.posX}, ${char.posY})

<pre>${minimap}</pre>

Легенда:
👤 — Вы | 🐷 — Поринг | 🐛 — Фабре
🐰 — Лунатик | 🟠 — Дропс | 🧙 — NPC
🌲 — Лес | 💧 — Вода | 🚪 — Врата
`;

    const keyboard = new InlineKeyboard().text("⬅️ Назад", "game:explore");

    await ctx.editMessageText(minimapText, {
      reply_markup: keyboard,
      parse_mode: "HTML",
    });
    await ctx.answerCallbackQuery();
  });
}

async function showGameView(ctx: any) {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  const char = await getCharacterByTelegramId(telegramId);
  if (!char) return;

  // Ensure monsters are spawned
  await spawnMonstersForMap(char.mapId);

  const mapData = await getMap(char.mapId);
  const minimap = await formatMinimap(char.mapId, char.posX, char.posY, 3);
  const monstersNearby = await getNearbyMonsters(char.mapId, char.posX, char.posY, 3);
  const npcsNearby = await getNearbyNpcs(char.mapId, char.posX, char.posY, 3);

  // Build location info
  let monstersText = "";
  if (monstersNearby.length > 0) {
    monstersText = "\n🐾 <b>Монстры рядом:</b>\n";
    for (const m of monstersNearby.slice(0, 5)) {
      const hpPct = Math.floor((m.instance.currentHp / m.template.hp) * 100);
      monstersText += `  ${m.direction} ${m.template.nameRu} Lv.${m.template.level} (${hpPct}% HP)${m.distance <= 1 ? " ⚔️" : ""}\n`;
    }
  }

  let npcsText = "";
  if (npcsNearby.length > 0) {
    npcsText = "\n🧙 <b>NPC рядом:</b>\n";
    for (const n of npcsNearby) {
      npcsText += `  ${n.direction} ${n.nameRu}${n.distance <= 1 ? " 💬" : ""}\n`;
    }
  }

  const tile = await getTile(char.mapId, char.posX, char.posY);
  const tileName = getTileName(tile?.tileType);

  const gameText = `
🗺️ <b>${mapData?.nameRu || char.mapId}</b> | 📍(${char.posX}, ${char.posY})
🟩 ${tileName}

<pre>${minimap}</pre>
${monstersText}${npcsText}
👤 <b>${char.name}</b> | Lv.${char.baseLevel} | ${char.jobClass.toUpperCase()}
${getHpBar(char.hp, char.maxHp)}
${getSpBar(char.sp, char.maxSp)}
💰 ${char.zeny}z | ⭐ EXP: ${char.baseExp}/${getExpForLevel(char.baseLevel + 1)}
${char.isSitting ? "🧘 Вы отдыхаете (регенерация x3)" : ""}
`;

  // Build keyboard
  const keyboard = new InlineKeyboard();

  // Movement row
  const exits = await getExits(char.mapId, char.posX, char.posY);
  const canNorth = exits.find((e) => e.direction === "north");
  const canSouth = exits.find((e) => e.direction === "south");
  const canWest = exits.find((e) => e.direction === "west");
  const canEast = exits.find((e) => e.direction === "east");

  keyboard.text(canNorth ? "⬆️" : "⬛", canNorth ? "move:north" : "noop");
  keyboard.row();
  keyboard.text(canWest ? "⬅️" : "⬛", canWest ? "move:west" : "noop");
  keyboard.text(canEast ? "➡️" : "⬛", canEast ? "move:east" : "noop");
  keyboard.row();
  keyboard.text(canSouth ? "⬇️" : "⬛", canSouth ? "move:south" : "noop");
  keyboard.row();

  // Attack buttons for adjacent monsters
  const adjacentMonsters = monstersNearby.filter((m) => m.distance <= 1);
  if (adjacentMonsters.length > 0) {
    for (const m of adjacentMonsters.slice(0, 3)) {
      keyboard.text(
        `⚔️ ${m.template.nameRu}`,
        `attack:${m.instance.id}`
      );
    }
    keyboard.row();
  }

  // NPC talk buttons
  const adjacentNpcs = npcsNearby.filter((n) => n.distance <= 1);
  if (adjacentNpcs.length > 0) {
    for (const n of adjacentNpcs.slice(0, 2)) {
      keyboard.text(`💬 ${n.nameRu}`, `npc:talk:${n.id}`);
    }
    keyboard.row();
  }

  // Action buttons
  keyboard.text(char.isSitting ? "🚶 Встать" : "🧘 Сесть", "action:sit");
  keyboard.text("🎒 Инвентарь", "inv:view");
  keyboard.row();
  keyboard.text("🗺️ Карта", "game:minimap");
  keyboard.text("📊 Статус", "char:view");
  keyboard.row();
  keyboard.text("🏠 Меню", "menu:main");

  await ctx.editMessageText(gameText, {
    reply_markup: keyboard,
    parse_mode: "HTML",
  });
}

async function showBattleView(ctx: any, battle: any, firstTurn: string) {
  const { getMonsterHpBar } = await import("../services/combatService");
  const { getHpBar, getSpBar } = await import("../services/characterService");
  const telegramId = ctx.from?.id;
  const char = await getCharacterByTelegramId(telegramId);
  if (!char) return;

  const battleText = `
⚔️ <b>БОЙ!</b>

👤 <b>${char.name}</b> Lv.${char.baseLevel}
${getHpBar(battle.playerHp, char.maxHp)}
${getSpBar(battle.playerSp, char.maxSp)}

🐾 <b>${battle.monsterName}</b> Lv.${battle.monsterLevel}
${getMonsterHpBar(battle.monsterHp, battle.monsterMaxHp)}

🎲 Инициатива: ${battle.playerInitiative} vs ${battle.monsterInitiative}
🎭 Первый ход: ${firstTurn === "player" ? "Вы!" : "Монстр!"}
`;

  const keyboard = new InlineKeyboard();

  if (firstTurn === "player") {
    keyboard.text("⚔️ Атаковать", "combat:attack");
    keyboard.text("🎒 Предмет", "combat:items");
    keyboard.row();
    keyboard.text("🏃 Сбежать", "combat:flee");
  } else {
    keyboard.text("⏳ Ход монстра...", "noop");
  }

  await ctx.editMessageText(battleText, {
    reply_markup: keyboard,
    parse_mode: "HTML",
  });
}

function getExpForLevel(level: number): number {
  if (level <= 1) return 0;
  const table = [0, 50, 120, 220, 350, 520, 750, 1050, 1450, 2000, 2800];
  return table[level] || 2800 + (level - 10) * 4000;
}
