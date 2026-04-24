import { relations } from "drizzle-orm";
import {
  characters,
  inventoryItems,
  battles,
  battleLogs,
  monsterInstances,
  monsterTemplates,
  maps,
  mapTiles,
  npcs,
  quests,
  questProgress,
  marketplaceListings,
  chatMessages,
  items,
} from "./schema";

export const charactersRelations = relations(characters, ({ many }) => ({
  inventory: many(inventoryItems),
  battleLogs: many(battleLogs),
  questProgress: many(questProgress),
  chatMessages: many(chatMessages),
}));

export const inventoryItemsRelations = relations(inventoryItems, ({ one }) => ({
  character: one(characters, {
    fields: [inventoryItems.characterId],
    references: [characters.id],
  }),
}));

export const battlesRelations = relations(battles, ({ many }) => ({
  logs: many(battleLogs),
}));

export const battleLogsRelations = relations(battleLogs, ({ one }) => ({
  battle: one(battles, {
    fields: [battleLogs.battleId],
    references: [battles.id],
  }),
}));

export const monsterInstancesRelations = relations(monsterInstances, ({ one }) => ({
  template: one(monsterTemplates, {
    fields: [monsterInstances.templateId],
    references: [monsterTemplates.id],
  }),
}));

export const monsterTemplatesRelations = relations(monsterTemplates, ({ many }) => ({
  instances: many(monsterInstances),
}));

export const mapsRelations = relations(maps, ({ many }) => ({
  tiles: many(mapTiles),
}));

export const mapTilesRelations = relations(mapTiles, ({ one }) => ({
  map: one(maps, {
    fields: [mapTiles.mapId],
    references: [maps.id],
  }),
}));

export const npcsRelations = relations(npcs, ({ one }) => ({
  map: one(maps, {
    fields: [npcs.mapId],
    references: [maps.id],
  }),
}));

export const questProgressRelations = relations(questProgress, ({ one }) => ({
  character: one(characters, {
    fields: [questProgress.characterId],
    references: [characters.id],
  }),
}));

export const marketplaceListingsRelations = relations(marketplaceListings, ({ one }) => ({
  seller: one(characters, {
    fields: [marketplaceListings.sellerId],
    references: [characters.id],
  }),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  character: one(characters, {
    fields: [chatMessages.characterId],
    references: [characters.id],
  }),
}));
