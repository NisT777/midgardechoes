import {
  sqliteTable,
  integer,
  text,
  real,
  index,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

// ============================================================
// MAPS & TILES
// ============================================================

export const maps = sqliteTable("maps", {
  id: text("id", { length: 50 }).primaryKey(), // "iz_ac02", "prt_fild08"
  nameRu: text("name_ru", { length: 255 }).notNull(),
  nameEn: text("name_en", { length: 255 }).notNull(),
  descriptionRu: text("description_ru"),
  descriptionEn: text("description_en"),
  width: integer("width", { mode: "number" }).notNull(),
  height: integer("height", { mode: "number" }).notNull(),
  type: text("type", { length: 20 }).notNull().default("field"),
  pvpEnabled: integer("pvp_enabled", { mode: "boolean" }).notNull().default(false),
  minLevel: integer("min_level", { mode: "number" }).notNull().default(1),
  maxLevel: integer("max_level", { mode: "number" }).notNull().default(99),
  imageUrl: text("image_url", { length: 500 }),
  bgmUrl: text("bgm_url", { length: 500 }),
  respawnMapId: text("respawn_map_id", { length: 50 }),
  respawnX: integer("respawn_x", { mode: "number" }),
  respawnY: integer("respawn_y", { mode: "number" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const mapTiles = sqliteTable("map_tiles", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  mapId: text("map_id", { length: 50 }).notNull(),
  x: integer("x", { mode: "number" }).notNull(),
  y: integer("y", { mode: "number" }).notNull(),
  tileType: text("tile_type", { length: 20 }).notNull().default("grass"),
  walkable: integer("walkable", { mode: "boolean" }).notNull().default(true),
  transitionTo: text("transition_to", { length: 50 }),
  transitionX: integer("transition_x", { mode: "number" }),
  transitionY: integer("transition_y", { mode: "number" }),
  metadata: text("metadata", { mode: "json" }),
}, (table) => [
  index("map_tiles_map_idx").on(table.mapId),
  uniqueIndex("map_tiles_pos_idx").on(table.mapId, table.x, table.y),
]);

// ============================================================
// MONSTERS
// ============================================================

export const monsterTemplates = sqliteTable("monster_templates", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  monsterId: text("monster_id", { length: 50 }).notNull().unique(),
  nameRu: text("name_ru", { length: 255 }).notNull(),
  nameEn: text("name_en", { length: 255 }).notNull(),
  descriptionRu: text("description_ru"),
  descriptionEn: text("description_en"),
  level: integer("level", { mode: "number" }).notNull(),
  hp: integer("hp", { mode: "number" }).notNull(),
  atk: integer("atk", { mode: "number" }).notNull(),
  def: integer("def", { mode: "number" }).notNull().default(0),
  mdef: integer("mdef", { mode: "number" }).notNull().default(0),
  hit: integer("hit", { mode: "number" }).notNull(),
  flee: integer("flee", { mode: "number" }).notNull(),
  aspd: integer("aspd", { mode: "number" }).notNull().default(100),
  element: text("element", { length: 20 }).notNull().default("neutral"),
  elementLevel: integer("element_level", { mode: "number" }).notNull().default(1),
  race: text("race", { length: 20 }).notNull().default("formless"),
  size: text("size", { length: 20 }).notNull().default("medium"),
  aggro: integer("aggro", { mode: "boolean" }).notNull().default(false),
  behavior: text("behavior", { length: 20 }).notNull().default("passive"),
  imageUrl: text("image_url", { length: 500 }),
  baseExp: integer("base_exp", { mode: "number" }).notNull().default(0),
  jobExp: integer("job_exp", { mode: "number" }).notNull().default(0),
  drops: text("drops", { mode: "json" }).$type<DropEntry[]>(),
  skills: text("skills", { mode: "json" }).$type<MonsterSkill[]>(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export interface DropEntry {
  itemId: string;
  chance: number;
  minCount?: number;
  maxCount?: number;
}

export interface MonsterSkill {
  name: string;
  level: number;
  damage?: number;
  element?: string;
  effect?: string;
}

export const monsterInstances = sqliteTable("monster_instances", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  templateId: integer("template_id", { mode: "number" }).notNull(),
  mapId: text("map_id", { length: 50 }).notNull(),
  x: integer("x", { mode: "number" }).notNull(),
  y: integer("y", { mode: "number" }).notNull(),
  currentHp: integer("current_hp", { mode: "number" }).notNull(),
  maxHp: integer("max_hp", { mode: "number" }).notNull(),
  status: text("status", { length: 20 }).notNull().default("alive"),
  engagedBy: integer("engaged_by", { mode: "number" }),
  respawnAt: integer("respawn_at", { mode: "timestamp" }),
  spawnedAt: integer("spawned_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
}, (table) => [
  index("monster_map_idx").on(table.mapId),
  index("monster_status_idx").on(table.status),
  index("monster_engaged_idx").on(table.engagedBy),
]);

// ============================================================
// ITEMS
// ============================================================

export const items = sqliteTable("items", {
  id: text("id", { length: 50 }).primaryKey(),
  nameRu: text("name_ru", { length: 255 }).notNull(),
  nameEn: text("name_en", { length: 255 }).notNull(),
  descriptionRu: text("description_ru"),
  descriptionEn: text("description_en"),
  type: text("type", { length: 20 }).notNull(),
  subType: text("sub_type", { length: 50 }),
  weight: integer("weight", { mode: "number" }).notNull().default(1),
  price: integer("price", { mode: "number" }).notNull().default(0),
  buyPrice: integer("buy_price", { mode: "number" }).notNull().default(0),
  atk: integer("atk", { mode: "number" }).default(0),
  def: integer("def", { mode: "number" }).default(0),
  matk: integer("matk", { mode: "number" }).default(0),
  slots: integer("slots", { mode: "number" }).default(0),
  equipLevel: integer("equip_level", { mode: "number" }).default(0),
  statBonus: text("stat_bonus", { mode: "json" }).$type<StatBonus>(),
  healHp: integer("heal_hp", { mode: "number" }).default(0),
  healSp: integer("heal_sp", { mode: "number" }).default(0),
  cardSlot: text("card_slot", { length: 20 }),
  element: text("element", { length: 20 }),
  imageUrl: text("image_url", { length: 500 }),
  stackable: integer("stackable", { mode: "boolean" }).notNull().default(true),
  maxStack: integer("max_stack", { mode: "number" }).notNull().default(99),
  tradable: integer("tradable", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export interface StatBonus {
  str?: number;
  agi?: number;
  vit?: number;
  int?: number;
  dex?: number;
  luk?: number;
  hp?: number;
  sp?: number;
  atk?: number;
  def?: number;
  matk?: number;
  mdef?: number;
  hit?: number;
  flee?: number;
  crit?: number;
  aspd?: number;
}

// ============================================================
// CHARACTERS (PLAYERS)
// ============================================================

export const characters = sqliteTable("characters", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  telegramId: integer("telegram_id", { mode: "number" }).notNull().unique(),
  name: text("name", { length: 24 }).notNull().unique(),

  jobClass: text("job_class", { length: 20 }).notNull().default("novice"),
  baseLevel: integer("base_level", { mode: "number" }).notNull().default(1),
  jobLevel: integer("job_level", { mode: "number" }).notNull().default(1),
  baseExp: integer("base_exp", { mode: "number" }).notNull().default(0),
  jobExp: integer("job_exp", { mode: "number" }).notNull().default(0),

  baseStr: integer("base_str", { mode: "number" }).notNull().default(1),
  baseAgi: integer("base_agi", { mode: "number" }).notNull().default(1),
  baseVit: integer("base_vit", { mode: "number" }).notNull().default(1),
  baseInt: integer("base_int", { mode: "number" }).notNull().default(1),
  baseDex: integer("base_dex", { mode: "number" }).notNull().default(1),
  baseLuk: integer("base_luk", { mode: "number" }).notNull().default(1),
  bonusStr: integer("bonus_str", { mode: "number" }).notNull().default(0),
  bonusAgi: integer("bonus_agi", { mode: "number" }).notNull().default(0),
  bonusVit: integer("bonus_vit", { mode: "number" }).notNull().default(0),
  bonusInt: integer("bonus_int", { mode: "number" }).notNull().default(0),
  bonusDex: integer("bonus_dex", { mode: "number" }).notNull().default(0),
  bonusLuk: integer("bonus_luk", { mode: "number" }).notNull().default(0),
  statPoints: integer("stat_points", { mode: "number" }).notNull().default(0),
  skillPoints: integer("skill_points", { mode: "number" }).notNull().default(0),

  hp: integer("hp", { mode: "number" }).notNull(),
  maxHp: integer("max_hp", { mode: "number" }).notNull(),
  sp: integer("sp", { mode: "number" }).notNull(),
  maxSp: integer("max_sp", { mode: "number" }).notNull(),

  atk: integer("atk", { mode: "number" }).notNull().default(0),
  def: integer("def", { mode: "number" }).notNull().default(0),
  matk: integer("matk", { mode: "number" }).notNull().default(0),
  mdef: integer("mdef", { mode: "number" }).notNull().default(0),
  hit: integer("hit", { mode: "number" }).notNull().default(0),
  flee: integer("flee", { mode: "number" }).notNull().default(0),
  crit: integer("crit", { mode: "number" }).notNull().default(0),
  aspd: integer("aspd", { mode: "number" }).notNull().default(100),

  zeny: integer("zeny", { mode: "number" }).notNull().default(0),
  kafraPoints: integer("kafra_points", { mode: "number" }).notNull().default(0),

  mapId: text("map_id", { length: 50 }).notNull().default("iz_ac02"),
  posX: integer("pos_x", { mode: "number" }).notNull().default(12),
  posY: integer("pos_y", { mode: "number" }).notNull().default(12),
  savedMapId: text("saved_map_id", { length: 50 }).notNull().default("izlude"),
  savedX: integer("saved_x", { mode: "number" }).notNull().default(20),
  savedY: integer("saved_y", { mode: "number" }).notNull().default(20),

  isDead: integer("is_dead", { mode: "boolean" }).notNull().default(false),
  isSitting: integer("is_sitting", { mode: "boolean" }).notNull().default(false),
  inBattle: integer("in_battle", { mode: "boolean" }).notNull().default(false),
  battleId: integer("battle_id", { mode: "number" }),

  language: text("language", { length: 10 }).notNull().default("ru"),
  chatEnabled: integer("chat_enabled", { mode: "boolean" }).notNull().default(true),
  showMinimap: integer("show_minimap", { mode: "boolean" }).notNull().default(true),

  equipment: text("equipment", { mode: "json" }).$type<EquipmentSlots | null>(),

  totalKills: integer("total_kills", { mode: "number" }).notNull().default(0),
  totalDeaths: integer("total_deaths", { mode: "number" }).notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  lastOnline: integer("last_online", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export interface EquipmentSlots {
  weapon?: string;
  armor?: string;
  shield?: string;
  head?: string;
  garment?: string;
  shoes?: string;
  accessory1?: string;
  accessory2?: string;
}

// ============================================================
// INVENTORY
// ============================================================

export const inventoryItems = sqliteTable("inventory_items", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  characterId: integer("character_id", { mode: "number" }).notNull(),
  itemId: text("item_id", { length: 50 }).notNull(),
  quantity: integer("quantity", { mode: "number" }).notNull().default(1),
  equipped: integer("equipped", { mode: "boolean" }).notNull().default(false),
  cards: text("cards", { mode: "json" }).$type<string[] | null>(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
}, (table) => [
  index("inv_char_idx").on(table.characterId),
  index("inv_item_idx").on(table.itemId),
]);

// ============================================================
// BATTLES
// ============================================================

export const battles = sqliteTable("battles", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  type: text("type", { length: 20 }).notNull().default("pve"),
  characterId: integer("character_id", { mode: "number" }).notNull(),
  monsterInstanceId: integer("monster_instance_id", { mode: "number" }),
  opponentId: integer("opponent_id", { mode: "number" }),
  status: text("status", { length: 20 }).notNull().default("active"),

  monsterName: text("monster_name", { length: 255 }),
  monsterLevel: integer("monster_level", { mode: "number" }),
  monsterHp: integer("monster_hp", { mode: "number" }),
  monsterMaxHp: integer("monster_max_hp", { mode: "number" }),
  monsterAtk: integer("monster_atk", { mode: "number" }),
  monsterDef: integer("monster_def", { mode: "number" }),
  monsterHit: integer("monster_hit", { mode: "number" }),
  monsterFlee: integer("monster_flee", { mode: "number" }),
  monsterElement: text("monster_element", { length: 20 }),
  monsterRace: text("monster_race", { length: 20 }),
  monsterSize: text("monster_size", { length: 20 }),
  monsterImageUrl: text("monster_image_url", { length: 500 }),

  currentTurn: integer("current_turn", { mode: "number" }).notNull().default(1),
  playerInitiative: integer("player_initiative", { mode: "number" }).notNull().default(0),
  monsterInitiative: integer("monster_initiative", { mode: "number" }).notNull().default(0),
  playerHp: integer("player_hp", { mode: "number" }).notNull(),
  playerSp: integer("player_sp", { mode: "number" }).notNull(),
  turnOrder: text("turn_order", { length: 20 }).notNull().default("player"),

  expGained: integer("exp_gained", { mode: "number" }).default(0),
  jobExpGained: integer("job_exp_gained", { mode: "number" }).default(0),
  zenyGained: integer("zeny_gained", { mode: "number" }).default(0),
  drops: text("drops", { mode: "json" }).$type<BattleDrop[]>(),

  startedAt: integer("started_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  endedAt: integer("ended_at", { mode: "timestamp" }),
  mapId: text("map_id", { length: 50 }).notNull(),
});

export interface BattleDrop {
  itemId: string;
  itemName: string;
  quantity: number;
  isCard: boolean;
}

export const battleLogs = sqliteTable("battle_logs", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  battleId: integer("battle_id", { mode: "number" }).notNull(),
  turn: integer("turn", { mode: "number" }).notNull(),
  actor: text("actor", { length: 20 }).notNull(),
  action: text("action", { length: 50 }).notNull(),
  damage: integer("damage", { mode: "number" }).default(0),
  isCrit: integer("is_crit", { mode: "boolean" }).notNull().default(false),
  isMiss: integer("is_miss", { mode: "boolean" }).notNull().default(false),
  hpRemaining: integer("hp_remaining", { mode: "number" }),
  messageRu: text("message_ru"),
  messageEn: text("message_en"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
}, (table) => [
  index("blog_battle_idx").on(table.battleId),
]);

// ============================================================
// NPCs
// ============================================================

export const npcs = sqliteTable("npcs", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  npcId: text("npc_id", { length: 50 }).notNull().unique(),
  nameRu: text("name_ru", { length: 255 }).notNull(),
  nameEn: text("name_en", { length: 255 }).notNull(),
  type: text("type", { length: 20 }).notNull().default("misc"),
  mapId: text("map_id", { length: 50 }).notNull(),
  x: integer("x", { mode: "number" }).notNull(),
  y: integer("y", { mode: "number" }).notNull(),
  imageUrl: text("image_url", { length: 500 }),
  dialogues: text("dialogues", { mode: "json" }).$type<NpcDialogue[]>(),
  shopItems: text("shop_items", { mode: "json" }).$type<string[]>(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export interface NpcDialogue {
  id: string;
  textRu: string;
  textEn: string;
  choices?: DialogueChoice[];
}

export interface DialogueChoice {
  id: string;
  textRu: string;
  textEn: string;
  action: string;
  requirements?: string[];
}

// ============================================================
// QUESTS
// ============================================================

export const quests = sqliteTable("quests", {
  id: text("id", { length: 50 }).primaryKey(),
  nameRu: text("name_ru", { length: 255 }).notNull(),
  nameEn: text("name_en", { length: 255 }).notNull(),
  descriptionRu: text("description_ru"),
  descriptionEn: text("description_en"),
  type: text("type", { length: 20 }).notNull().default("main"),
  minLevel: integer("min_level", { mode: "number" }).notNull().default(1),
  npcGiverId: text("npc_giver_id", { length: 50 }),
  npcCompleterId: text("npc_completer_id", { length: 50 }),
  requirements: text("requirements", { mode: "json" }).$type<QuestRequirement[]>(),
  rewards: text("rewards", { mode: "json" }).$type<QuestReward>(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export interface QuestRequirement {
  type: "kill" | "gather" | "deliver" | "visit" | "level";
  targetId?: string;
  targetName?: string;
  count?: number;
}

export interface QuestReward {
  baseExp?: number;
  jobExp?: number;
  zeny?: number;
  items?: { itemId: string; quantity: number }[];
  statPoints?: number;
  skillPoints?: number;
}

export const questProgress = sqliteTable("quest_progress", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  characterId: integer("character_id", { mode: "number" }).notNull(),
  questId: text("quest_id", { length: 50 }).notNull(),
  status: text("status", { length: 20 }).notNull().default("active"),
  progress: text("progress", { mode: "json" }).$type<Record<string, number> | null>(),
  startedAt: integer("started_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  completedAt: integer("completed_at", { mode: "timestamp" }),
}, (table) => [
  index("quest_char_idx").on(table.characterId),
  uniqueIndex("quest_char_quest_idx").on(table.characterId, table.questId),
]);

// ============================================================
// LEADERBOARD
// ============================================================

export const leaderboard = sqliteTable("leaderboard", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  characterId: integer("character_id", { mode: "number" }).notNull(),
  category: text("category", { length: 20 }).notNull(),
  value: integer("value", { mode: "number" }).notNull().default(0),
  rank: integer("rank", { mode: "number" }).notNull().default(0),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
}, (table) => [
  uniqueIndex("lb_char_cat_idx").on(table.characterId, table.category),
  index("lb_cat_val_idx").on(table.category, table.value),
]);

// ============================================================
// MARKETPLACE
// ============================================================

export const marketplaceListings = sqliteTable("marketplace_listings", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  sellerId: integer("seller_id", { mode: "number" }).notNull(),
  itemId: text("item_id", { length: 50 }).notNull(),
  quantity: integer("quantity", { mode: "number" }).notNull().default(1),
  price: integer("price", { mode: "number" }).notNull(),
  cards: text("cards", { mode: "json" }).$type<string[] | null>(),
  listedAt: integer("listed_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  status: text("status", { length: 20 }).notNull().default("active"),
  buyerId: integer("buyer_id", { mode: "number" }),
  soldAt: integer("sold_at", { mode: "timestamp" }),
});

// ============================================================
// CHAT MESSAGES
// ============================================================

export const chatMessages = sqliteTable("chat_messages", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  characterId: integer("character_id", { mode: "number" }).notNull(),
  characterName: text("character_name", { length: 24 }).notNull(),
  channel: text("channel", { length: 20 }).notNull(),
  targetId: integer("target_id", { mode: "number" }),
  mapId: text("map_id", { length: 50 }),
  message: text("message").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
}, (table) => [
  index("chat_channel_idx").on(table.channel),
  index("chat_map_idx").on(table.mapId),
  index("chat_char_idx").on(table.characterId),
]);

// ============================================================
// BOT PLAYERS
// ============================================================

export const botPlayers = sqliteTable("bot_players", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  name: text("name", { length: 24 }).notNull().unique(),
  behavior: text("behavior", { length: 20 }).notNull(),
  template: text("template", { mode: "json" }).$type<BotTemplate>(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  schedule: text("schedule", { mode: "json" }).$type<BotSchedule>(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export interface BotTemplate {
  jobClass: string;
  level: number;
  stats: { str: number; agi: number; vit: number; int: number; dex: number; luk: number };
  equipment: EquipmentSlots;
  maps: string[];
  routines: BotRoutine[];
}

export interface BotRoutine {
  type: "grind" | "heal" | "trade" | "arena";
  mapId: string;
  duration: number;
}

export interface BotSchedule {
  onlineHours: number[];
  routines: BotRoutine[];
}
