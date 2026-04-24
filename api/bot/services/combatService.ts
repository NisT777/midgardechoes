import { getDb } from "../../queries/connection";
import { battles, battleLogs, monsterInstances, characters, inventoryItems, items } from "@db/schema";
import { eq, desc } from "drizzle-orm";
import { getCharacterById, updateCharacterHpSp, addExp, addItemToInventory, getInventoryWithItems } from "./characterService";
import { getMonsterWithTemplate, respawnDeadMonsters } from "./mapService";

const db = getDb();

// Elemental damage modifiers (attacking element -> defending element)
const ELEMENT_MODIFIERS: Record<string, Record<string, number>> = {
  neutral: { neutral: 100, water: 100, earth: 100, fire: 100, wind: 100, poison: 100, holy: 100, shadow: 100, ghost: 100, undead: 100 },
  water: { neutral: 100, water: 25, earth: 100, fire: 50, wind: 175, poison: 100, holy: 100, shadow: 100, ghost: 100, undead: 100 },
  earth: { neutral: 100, water: 100, earth: 25, fire: 175, wind: 50, poison: 100, holy: 100, shadow: 100, ghost: 100, undead: 100 },
  fire: { neutral: 100, water: 175, earth: 50, fire: 25, wind: 100, poison: 100, holy: 100, shadow: 100, ghost: 100, undead: 100 },
  wind: { neutral: 100, water: 50, earth: 175, fire: 100, wind: 25, poison: 100, holy: 100, shadow: 100, ghost: 100, undead: 100 },
  poison: { neutral: 100, water: 100, earth: 75, fire: 100, wind: 100, poison: 25, holy: 100, shadow: 75, ghost: 100, undead: 50 },
  holy: { neutral: 100, water: 100, earth: 100, fire: 100, wind: 100, poison: 100, holy: 25, shadow: 175, ghost: 125, undead: 200 },
  shadow: { neutral: 100, water: 100, earth: 100, fire: 100, wind: 100, poison: 75, holy: 175, shadow: 25, ghost: 125, undead: 25 },
  ghost: { neutral: 25, water: 100, earth: 100, fire: 100, wind: 100, poison: 100, holy: 125, shadow: 125, ghost: 175, undead: 100 },
  undead: { neutral: 100, water: 100, earth: 100, fire: 100, wind: 100, poison: 50, holy: 200, shadow: 0, ghost: 100, undead: 0 },
};

function getElementModifier(atkElement: string, defElement: string): number {
  const mods = ELEMENT_MODIFIERS[atkElement] || ELEMENT_MODIFIERS.neutral;
  return (mods[defElement] || 100) / 100;
}

export async function startBattle(charId: number, monsterInstanceId: number) {
  const char = await getCharacterById(charId);
  if (!char || char.inBattle || char.isDead) return null;

  const monsterData = await getMonsterWithTemplate(monsterInstanceId);
  if (!monsterData || !monsterData.template) return null;

  const { instance, template } = monsterData;
  if (instance.status !== "alive" || instance.engagedBy) return null;

  // Mark monster as in combat
  await db
    .update(monsterInstances)
    .set({ status: "in_combat", engagedBy: charId })
    .where(eq(monsterInstances.id, monsterInstanceId));

  // Mark character as in battle
  const playerInitiative = char.baseAgi + char.baseDex / 5 + char.baseLuk / 10;
  const monsterInitiative = template.flee / 3 + Math.random() * 10;

  const turnOrder = playerInitiative >= monsterInitiative ? "player" : "monster";

  const battleResult = await db.insert(battles).values({
    type: "pve",
    characterId: charId,
    monsterInstanceId,
    status: "active",
    monsterName: template.nameRu,
    monsterLevel: template.level,
    monsterHp: instance.currentHp,
    monsterMaxHp: template.hp,
    monsterAtk: template.atk,
    monsterDef: template.def,
    monsterHit: template.hit,
    monsterFlee: template.flee,
    monsterElement: template.element,
    monsterRace: template.race,
    monsterSize: template.size,
    monsterImageUrl: template.imageUrl,
    currentTurn: 1,
    playerInitiative: Math.floor(playerInitiative),
    monsterInitiative: Math.floor(monsterInitiative),
    playerHp: char.hp,
    playerSp: char.sp,
    turnOrder,
    mapId: char.mapId,
  });

  // Get the inserted battle ID
  const newBattle = await db.query.battles.findFirst({
    orderBy: [desc(battles.id)],
  });
  const battleId = newBattle?.id || 0;

  await db
    .update(characters)
    .set({ inBattle: true, battleId })
    .where(eq(characters.id, charId));

  // Initial battle log
  if (battleId > 0) {
    await db.insert(battleLogs).values({
      battleId,
      turn: 0,
      actor: "player",
      action: "start",
      messageRu: `Бой начался! ${template.nameRu} Lv.${template.level} — HP: ${instance.currentHp}/${template.hp}`,
      messageEn: `Battle started! ${template.nameEn} Lv.${template.level} — HP: ${instance.currentHp}/${template.hp}`,
    });
  }

  const battle = await db.query.battles.findFirst({
    where: eq(battles.id, battleId),
  });

  return { battle, firstTurn: turnOrder };
}

export async function getActiveBattle(charId: number) {
  return db.query.battles.findFirst({
    where: eq(battles.characterId, charId),
    orderBy: [desc(battles.id)],
  });
}

export async function playerAttack(battleId: number) {
  const battle = await db.query.battles.findFirst({
    where: eq(battles.id, battleId),
  });
  if (!battle || battle.status !== "active") return null;

  const char = await getCharacterById(battle.characterId);
  if (!char) return null;

  // Calculate player damage
  const isCrit = Math.random() * 100 < char.crit;
  const monsterFlee = battle.monsterFlee || 0;
  const monsterDef = battle.monsterDef || 0;
  const monsterHp = battle.monsterHp || 0;
  const isMiss = Math.random() * 100 > (char.hit - monsterFlee) * 0.5 + 75;

  let damage = 0;
  if (!isMiss) {
    const baseDamage = char.atk - monsterDef;
    const variance = baseDamage * 0.1;
    damage = Math.max(1, Math.floor(baseDamage + (Math.random() * variance * 2 - variance)));

    // Elemental modifier
    const elementMod = getElementModifier("neutral", battle.monsterElement || "neutral");
    damage = Math.floor(damage * elementMod);

    if (isCrit) damage = Math.floor(damage * 1.5);
  }

  const newMonsterHp = Math.max(0, monsterHp - damage);

  // Update battle
  await db
    .update(battles)
    .set({
      monsterHp: newMonsterHp,
      turnOrder: "monster",
      currentTurn: battle.currentTurn + 1,
    })
    .where(eq(battles.id, battleId));

  // Log
  const logMessageRu = isMiss
    ? `Вы промахнулись!`
    : isCrit
    ? `💥 КРИТ! Вы нанесли ${damage} урона!`
    : `Вы атаковали и нанесли ${damage} урона.`;

  const logMessageEn = isMiss
    ? `You missed!`
    : isCrit
    ? `💥 CRIT! You dealt ${damage} damage!`
    : `You attacked and dealt ${damage} damage.`;

  await db.insert(battleLogs).values({
    battleId,
    turn: battle.currentTurn,
    actor: "player",
    action: "attack",
    damage,
    isCrit,
    isMiss,
    hpRemaining: newMonsterHp,
    messageRu: logMessageRu,
    messageEn: logMessageEn,
  });

  // Check if monster is dead
  if (newMonsterHp <= 0) {
    return await endBattle(battleId, "won");
  }

  return {
    type: "turn_result" as const,
    actor: "player",
    isMiss,
    isCrit,
    damage,
    monsterHp: newMonsterHp,
    monsterMaxHp: battle.monsterMaxHp,
    playerHp: battle.playerHp,
    nextTurn: "monster",
  };
}

export async function monsterAttack(battleId: number) {
  const battle = await db.query.battles.findFirst({
    where: eq(battles.id, battleId),
  });
  if (!battle || battle.status !== "active") return null;

  const char = await getCharacterById(battle.characterId);
  if (!char) return null;

  // Calculate monster damage
  const monsterHit = battle.monsterHit || 0;
  const monsterAtk = battle.monsterAtk || 0;
  const playerHp = battle.playerHp || 0;
  const isMiss = Math.random() * 100 < (char.flee - monsterHit) * 0.5 + 10;

  let damage = 0;
  if (!isMiss) {
    const baseDamage = monsterAtk - char.def;
    const variance = baseDamage * 0.1;
    damage = Math.max(1, Math.floor(baseDamage + (Math.random() * variance * 2 - variance)));
  }

  const newPlayerHp = Math.max(0, playerHp - damage);

  // Update battle
  await db
    .update(battles)
    .set({
      playerHp: newPlayerHp,
      turnOrder: "player",
      currentTurn: battle.currentTurn + 1,
    })
    .where(eq(battles.id, battleId));

  // Log
  const logMessageRu = isMiss
    ? `${battle.monsterName} промахнулся!`
    : `${battle.monsterName} атаковал и нанёс ${damage} урона!`;

  const logMessageEn = isMiss
    ? `${battle.monsterName} missed!`
    : `${battle.monsterName} attacked and dealt ${damage} damage!`;

  await db.insert(battleLogs).values({
    battleId,
    turn: battle.currentTurn,
    actor: "monster",
    action: "attack",
    damage,
    isMiss,
    hpRemaining: newPlayerHp,
    messageRu: logMessageRu,
    messageEn: logMessageEn,
  });

  // Check if player is dead
  if (newPlayerHp <= 0) {
    return await endBattle(battleId, "lost");
  }

  // Update character HP
  await updateCharacterHpSp(battle.characterId, newPlayerHp, battle.playerSp);

  return {
    type: "turn_result" as const,
    actor: "monster",
    isMiss,
    damage,
    playerHp: newPlayerHp,
    playerMaxHp: char.maxHp,
    monsterHp: battle.monsterHp,
    nextTurn: "player",
  };
}

export async function playerUseItem(battleId: number, itemId: string) {
  const battle = await db.query.battles.findFirst({
    where: eq(battles.id, battleId),
  });
  if (!battle || battle.status !== "active") return null;

  const char = await getCharacterById(battle.characterId);
  if (!char) return null;

  // Get item from inventory
  const invItems = await getInventoryWithItems(char.id);
  const invItem = invItems.find((i) => i.itemId === itemId && i.itemData.type === "consumable");
  if (!invItem || invItem.quantity <= 0) {
    return { type: "error" as const, message: "У вас нет этого предмета!" };
  }

  // Use item
  const healHp = invItem.itemData.healHp || 0;
  const newHp = Math.min(char.maxHp, battle.playerHp + healHp);

  // Consume item
  await db
    .update(inventoryItems)
    .set({ quantity: invItem.quantity - 1 })
    .where(eq(inventoryItems.id, invItem.id));

  // Update battle
  await db
    .update(battles)
    .set({
      playerHp: newHp,
      turnOrder: "monster",
      currentTurn: battle.currentTurn + 1,
    })
    .where(eq(battles.id, battleId));

  // Log
  await db.insert(battleLogs).values({
    battleId,
    turn: battle.currentTurn,
    actor: "player",
    action: "item",
    messageRu: `Вы использовали ${invItem.itemData.nameRu} и восстановили ${healHp} HP!`,
    messageEn: `You used ${invItem.itemData.nameEn} and restored ${healHp} HP!`,
  });

  return {
    type: "item_used" as const,
    itemName: invItem.itemData.nameRu,
    healHp,
    playerHp: newHp,
    nextTurn: "monster",
  };
}

export async function playerFlee(battleId: number) {
  const battle = await db.query.battles.findFirst({
    where: eq(battles.id, battleId),
  });
  if (!battle || battle.status !== "active") return null;

  const char = await getCharacterById(battle.characterId);
  if (!char) return null;

  // Flee chance: base 50% + (AGI - monster_AGI) * 2%
  const fleeChance = 50 + (char.baseAgi - 5) * 2;
  const success = Math.random() * 100 < fleeChance;

  if (success) {
    return await endBattle(battleId, "escaped");
  }

  // Failed to flee, monster gets a turn
  await db
    .update(battles)
    .set({
      turnOrder: "monster",
      currentTurn: battle.currentTurn + 1,
    })
    .where(eq(battles.id, battleId));

  await db.insert(battleLogs).values({
    battleId,
    turn: battle.currentTurn,
    actor: "player",
    action: "flee",
    messageRu: "Вы не смогли сбежать!",
    messageEn: "You failed to escape!",
  });

  return {
    type: "flee_failed" as const,
    nextTurn: "monster",
  };
}

export async function endBattle(battleId: number, outcome: "won" | "lost" | "escaped") {
  const battle = await db.query.battles.findFirst({
    where: eq(battles.id, battleId),
  });
  if (!battle) return null;

  const char = await getCharacterById(battle.characterId);
  if (!char) return null;

  // Release monster
  if (battle.monsterInstanceId) {
    if (outcome === "won") {
      // Monster dies
      await db
        .update(monsterInstances)
        .set({
          status: "dead",
          currentHp: 0,
          engagedBy: null,
          respawnAt: new Date(Date.now() + 5000), // 5 second respawn
        })
        .where(eq(monsterInstances.id, battle.monsterInstanceId));
    } else {
      // Release monster
      await db
        .update(monsterInstances)
        .set({ status: "alive", engagedBy: null })
        .where(eq(monsterInstances.id, battle.monsterInstanceId));
    }
  }

  // Update battle status
  await db
    .update(battles)
    .set({ status: outcome, endedAt: new Date() })
    .where(eq(battles.id, battleId));

  // Update character
  const updateData: any = {
    inBattle: false,
    battleId: null,
  };

  if (outcome === "won") {
    // Calculate rewards
    const monsterData = battle.monsterInstanceId
      ? await getMonsterWithTemplate(battle.monsterInstanceId)
      : null;

    let expGained = 0;
    let jobExpGained = 0;
    let zenyGained = 0;
    const drops: { itemId: string; itemName: string; quantity: number; isCard: boolean }[] = [];

    if (monsterData && monsterData.template) {
      expGained = monsterData.template.baseExp;
      jobExpGained = monsterData.template.jobExp;
      zenyGained = Math.floor(Math.random() * 20) + 10;

      // Process drops
      if (monsterData.template.drops) {
        for (const drop of monsterData.template.drops as any[]) {
          if (Math.random() * 100 < drop.chance) {
            const qty = drop.minCount && drop.maxCount
              ? Math.floor(Math.random() * (drop.maxCount - drop.minCount + 1)) + drop.minCount
              : 1;

            const itemData = await db.query.items.findFirst({
              where: eq(items.id, drop.itemId),
            });

            if (itemData) {
              await addItemToInventory(char.id, drop.itemId, qty);
              drops.push({
                itemId: drop.itemId,
                itemName: itemData.nameRu,
                quantity: qty,
                isCard: itemData.type === "card",
              });
            }
          }
        }
      }
    }

    // Add EXP
    const expResult = await addExp(char.id, expGained, jobExpGained);

    // Add zeny
    await db
      .update(characters)
      .set({ zeny: char.zeny + zenyGained })
      .where(eq(characters.id, char.id));

    await db
      .update(battles)
      .set({ expGained, jobExpGained, zenyGained, drops: drops as any })
      .where(eq(battles.id, battleId));

    // Log
    await db.insert(battleLogs).values({
      battleId,
      turn: battle.currentTurn,
      actor: "player",
      action: "win",
      messageRu: `🎉 Победа! +${expGained} EXP, +${jobExpGained} Job EXP, +${zenyGained}z` + (expResult?.leveledUp ? "\n⭐ LEVEL UP!" : ""),
      messageEn: `🎉 Victory! +${expGained} EXP, +${jobExpGained} Job EXP, +${zenyGained}z` + (expResult?.leveledUp ? "\n⭐ LEVEL UP!" : ""),
    });

    // Update HP/SP
    updateData.hp = Math.min(char.maxHp, battle.playerHp);
    updateData.sp = Math.min(char.maxSp, battle.playerSp);
    updateData.totalKills = char.totalKills + 1;

    await db
      .update(characters)
      .set(updateData)
      .where(eq(characters.id, char.id));

    return {
      type: "battle_end" as const,
      outcome: "won",
      expGained,
      jobExpGained,
      zenyGained,
      drops,
      leveledUp: expResult?.leveledUp || false,
    };
  } else if (outcome === "lost") {
    // Death penalty: lose 1% Base EXP
    const expLost = Math.floor(char.baseExp * 0.01);
    const newExp = Math.max(0, char.baseExp - expLost);

    updateData.hp = 1;
    updateData.sp = 1;
    updateData.isDead = false;
    updateData.baseExp = newExp;
    updateData.totalDeaths = char.totalDeaths + 1;
    updateData.mapId = char.savedMapId;
    updateData.posX = char.savedX;
    updateData.posY = char.savedY;

    await db
      .update(characters)
      .set(updateData)
      .where(eq(characters.id, char.id));

    await db.insert(battleLogs).values({
      battleId,
      turn: battle.currentTurn,
      actor: "player",
      action: "lose",
      messageRu: `💀 Вы пали в бою... Потеряно ${expLost} EXP. Вас телепортировали в город.`,
      messageEn: `💀 You fell in battle... Lost ${expLost} EXP. You were teleported to town.`,
    });

    return {
      type: "battle_end" as const,
      outcome: "lost",
      expLost,
    };
  } else {
    // Escaped
    updateData.hp = Math.min(char.maxHp, battle.playerHp);
    updateData.sp = Math.min(char.maxSp, battle.playerSp);

    await db
      .update(characters)
      .set(updateData)
      .where(eq(characters.id, char.id));

    await db.insert(battleLogs).values({
      battleId,
      turn: battle.currentTurn,
      actor: "player",
      action: "escape",
      messageRu: "🏃 Вы успешно сбежали!",
      messageEn: "🏃 You escaped successfully!",
    });

    return {
      type: "battle_end" as const,
      outcome: "escaped",
    };
  }
}

export async function getBattleLogs(battleId: number, limit: number = 10) {
  return db
    .select()
    .from(battleLogs)
    .where(eq(battleLogs.battleId, battleId))
    .orderBy(desc(battleLogs.id))
    .limit(limit);
}

export function getMonsterHpBar(current: number, max: number): string {
  const pct = Math.max(0, Math.min(100, Math.floor((current / max) * 100)));
  const filled = Math.floor(pct / 10);
  const empty = 10 - filled;
  let emoji = "🟢";
  if (pct < 30) emoji = "🔴";
  else if (pct < 60) emoji = "🟡";
  return `${emoji} ${current}/${max} [${"█".repeat(filled)}${"░".repeat(empty)}]`;
}
