import { getDb } from "../../queries/connection";
import { characters, items, inventoryItems } from "@db/schema";
import { eq, and } from "drizzle-orm";

const db = getDb();

// EXP table for levels 1-10 (RO-like exponential growth)
const EXP_TABLE = [0, 50, 120, 220, 350, 520, 750, 1050, 1450, 2000, 2800];

export function getExpForLevel(level: number): number {
  if (level <= 1) return 0;
  if (level > 10) return EXP_TABLE[10] + (level - 10) * 4000;
  return EXP_TABLE[level] || 0;
}

export function calculateMaxHp(vit: number, level: number): number {
  return Math.floor(35 + vit * 5 + level * 5);
}

export function calculateMaxSp(int: number, level: number): number {
  return Math.floor(10 + int * 2 + level * 2);
}

export function calculateAtk(str: number, dex: number, weaponAtk: number = 0): number {
  return Math.floor(str + weaponAtk + dex / 5);
}

export function calculateDef(vit: number, armorDef: number = 0): number {
  return Math.floor(vit / 2 + armorDef);
}

export function calculateHit(dex: number, level: number): number {
  return Math.floor(level + dex + 15);
}

export function calculateFlee(agi: number, level: number): number {
  return Math.floor(level + agi + 10);
}

export function calculateCrit(luk: number): number {
  return Math.floor(luk / 3 + 1);
}

export function calculateAspd(agi: number, weaponAspd: number = 100): number {
  return Math.floor(weaponAspd + agi / 4);
}

export function recalculateStats(char: typeof characters.$inferSelect) {
  const totalStr = char.baseStr + char.bonusStr;
  const totalAgi = char.baseAgi + char.bonusAgi;
  const totalVit = char.baseVit + char.bonusVit;
  const totalInt = char.baseInt + char.bonusInt;
  const totalDex = char.baseDex + char.bonusDex;
  const totalLuk = char.baseLuk + char.bonusLuk;

  const maxHp = calculateMaxHp(totalVit, char.baseLevel);
  const maxSp = calculateMaxSp(totalInt, char.baseLevel);

  return {
    maxHp,
    maxSp,
    atk: calculateAtk(totalStr, totalDex),
    def: calculateDef(totalVit),
    matk: Math.floor(totalInt * 2),
    mdef: Math.floor(totalInt / 2),
    hit: calculateHit(totalDex, char.baseLevel),
    flee: calculateFlee(totalAgi, char.baseLevel),
    crit: calculateCrit(totalLuk),
    aspd: calculateAspd(totalAgi),
  };
}

export async function getOrCreateCharacter(telegramId: number, username?: string) {
  const existing = await db.query.characters.findFirst({
    where: eq(characters.telegramId, telegramId),
  });

  if (existing) {
    return existing;
  }

  // Create new character
  const name = username || `Novice_${telegramId.toString().slice(-4)}`;
  const maxHp = calculateMaxHp(1, 1);
  const maxSp = calculateMaxSp(1, 1);

  const result = await db.insert(characters).values({
    telegramId,
    name,
    hp: maxHp,
    maxHp,
    sp: maxSp,
    maxSp,
    atk: calculateAtk(1, 1),
    def: calculateDef(1),
    hit: calculateHit(1, 1),
    flee: calculateFlee(1, 1),
    crit: calculateCrit(1),
    aspd: calculateAspd(1),
    baseStr: 1,
    baseAgi: 1,
    baseVit: 1,
    baseInt: 1,
    baseDex: 1,
    baseLuk: 1,
  });

  const newChar = await db.query.characters.findFirst({
    where: eq(characters.telegramId, telegramId),
  });

  // Give starter items
  if (newChar) {
    await db.insert(inventoryItems).values([
      { characterId: newChar.id, itemId: "knife", quantity: 1, equipped: true },
      { characterId: newChar.id, itemId: "cotton_shirt", quantity: 1, equipped: true },
      { characterId: newChar.id, itemId: "red_potion", quantity: 5 },
    ]);
  }

  return newChar!;
}

export async function getCharacterByTelegramId(telegramId: number) {
  return db.query.characters.findFirst({
    where: eq(characters.telegramId, telegramId),
  });
}

export async function getCharacterById(id: number) {
  return db.query.characters.findFirst({
    where: eq(characters.id, id),
  });
}

export async function updateCharacterPosition(
  charId: number,
  mapId: string,
  x: number,
  y: number
) {
  await db
    .update(characters)
    .set({ mapId, posX: x, posY: y, updatedAt: new Date() })
    .where(eq(characters.id, charId));
}

export async function updateCharacterHpSp(charId: number, hp: number, sp: number) {
  await db
    .update(characters)
    .set({ hp, sp, updatedAt: new Date() })
    .where(eq(characters.id, charId));
}

export async function updateCharacterStats(charId: number, updates: Partial<typeof characters.$inferSelect>) {
  await db
    .update(characters)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(characters.id, charId));
}

export async function addExp(charId: number, baseExp: number, jobExp: number) {
  const char = await getCharacterById(charId);
  if (!char) return null;

  let newBaseExp = char.baseExp + baseExp;
  let newJobExp = char.jobExp + jobExp;
  let newBaseLevel = char.baseLevel;
  let newJobLevel = char.jobLevel;
  let statPoints = char.statPoints;
  let skillPoints = char.skillPoints;
  let leveledUp = false;

  // Check base level up
  while (newBaseLevel < 99) {
    const needed = getExpForLevel(newBaseLevel + 1);
    if (newBaseExp >= needed) {
      newBaseExp -= needed;
      newBaseLevel++;
      statPoints += 3; // 3 stat points per level for Novice
      leveledUp = true;
    } else {
      break;
    }
  }

  // Check job level up
  while (newJobLevel < 10) {
    const needed = getExpForLevel(newJobLevel + 1);
    if (newJobExp >= needed) {
      newJobExp -= needed;
      newJobLevel++;
      skillPoints += 1;
    } else {
      break;
    }
  }

  // Recalculate stats
  const stats = recalculateStats({
    ...char,
    baseLevel: newBaseLevel,
    baseStr: char.baseStr,
    baseAgi: char.baseAgi,
    baseVit: char.baseVit,
    baseInt: char.baseInt,
    baseDex: char.baseDex,
    baseLuk: char.baseLuk,
  } as any);

  await db
    .update(characters)
    .set({
      baseExp: newBaseExp,
      jobExp: newJobExp,
      baseLevel: newBaseLevel,
      jobLevel: newJobLevel,
      statPoints,
      skillPoints,
      maxHp: stats.maxHp,
      maxSp: stats.maxSp,
      hp: leveledUp ? stats.maxHp : Math.min(char.hp, stats.maxHp),
      sp: leveledUp ? stats.maxSp : Math.min(char.sp, stats.maxSp),
      atk: stats.atk,
      def: stats.def,
      matk: stats.matk,
      mdef: stats.mdef,
      hit: stats.hit,
      flee: stats.flee,
      crit: stats.crit,
      aspd: stats.aspd,
      updatedAt: new Date(),
    })
    .where(eq(characters.id, charId));

  const updated = await getCharacterById(charId);
  return { character: updated, leveledUp };
}

export async function allocateStat(charId: number, stat: "str" | "agi" | "vit" | "int" | "dex" | "luk") {
  const char = await getCharacterById(charId);
  if (!char || char.statPoints <= 0) return null;

  const statField = `base${stat.charAt(0).toUpperCase() + stat.slice(1)}` as keyof typeof char;
  const currentValue = char[statField] as number;

  const stats = recalculateStats({
    ...char,
    [statField]: currentValue + 1,
  } as any);

  await db
    .update(characters)
    .set({
      [statField]: currentValue + 1,
      statPoints: char.statPoints - 1,
      maxHp: stats.maxHp,
      maxSp: stats.maxSp,
      atk: stats.atk,
      def: stats.def,
      matk: stats.matk,
      mdef: stats.mdef,
      hit: stats.hit,
      flee: stats.flee,
      crit: stats.crit,
      aspd: stats.aspd,
      updatedAt: new Date(),
    })
    .where(eq(characters.id, charId));

  return getCharacterById(charId);
}

export async function getInventoryWithItems(charId: number) {
  const inv = await db
    .select()
    .from(inventoryItems)
    .where(eq(inventoryItems.characterId, charId));

  const result = [];
  for (const item of inv) {
    const itemData = await db.query.items.findFirst({
      where: eq(items.id, item.itemId),
    });
    if (itemData) {
      result.push({ ...item, itemData });
    }
  }
  return result;
}

export async function addItemToInventory(charId: number, itemId: string, quantity: number = 1) {
  // Check if item already exists
  const existing = await db
    .select()
    .from(inventoryItems)
    .where(
      and(
        eq(inventoryItems.characterId, charId),
        eq(inventoryItems.itemId, itemId),
        eq(inventoryItems.equipped, false)
      )
    )
    .then((rows) => rows[0]);

  if (existing) {
    await db
      .update(inventoryItems)
      .set({ quantity: existing.quantity + quantity })
      .where(eq(inventoryItems.id, existing.id));
  } else {
    await db.insert(inventoryItems).values({
      characterId: charId,
      itemId,
      quantity,
    });
  }
}

export function getExpBar(currentExp: number, level: number): string {
  const needed = getExpForLevel(level + 1) - getExpForLevel(level);
  const progress = Math.min(100, Math.floor((currentExp / needed) * 100));
  const filled = Math.floor(progress / 10);
  const empty = 10 - filled;
  return "█".repeat(filled) + "░".repeat(empty) + ` ${progress}%`;
}

export function getHpBar(current: number, max: number): string {
  const pct = Math.max(0, Math.min(100, Math.floor((current / max) * 100)));
  const filled = Math.floor(pct / 10);
  const empty = 10 - filled;
  let emoji = "🟢";
  if (pct < 30) emoji = "🔴";
  else if (pct < 60) emoji = "🟡";
  return `${emoji} ${current}/${max} [${"█".repeat(filled)}${"░".repeat(empty)}] ${pct}%`;
}

export function getSpBar(current: number, max: number): string {
  const pct = Math.max(0, Math.min(100, Math.floor((current / max) * 100)));
  const filled = Math.floor(pct / 10);
  const empty = 10 - filled;
  return `🔵 ${current}/${max} [${"█".repeat(filled)}${"░".repeat(empty)}] ${pct}%`;
}
