import { getDb } from "../../queries/connection";
import { maps, mapTiles, monsterInstances, monsterTemplates, npcs } from "@db/schema";
import { eq, and } from "drizzle-orm";

const db = getDb();

export async function getMap(mapId: string) {
  return db.query.maps.findFirst({
    where: eq(maps.id, mapId),
  });
}

export async function getTile(mapId: string, x: number, y: number) {
  return db.query.mapTiles.findFirst({
    where: and(eq(mapTiles.mapId, mapId), eq(mapTiles.x, x), eq(mapTiles.y, y)),
  });
}

export async function getViewport(mapId: string, centerX: number, centerY: number, radius: number = 3) {
  const tiles = [];
  for (let dy = -radius; dy <= radius; dy++) {
    const row = [];
    for (let dx = -radius; dx <= radius; dx++) {
      const x = centerX + dx;
      const y = centerY + dy;
      const tile = await getTile(mapId, x, y);
      row.push({
        x,
        y,
        tile,
        relativeX: dx + radius,
        relativeY: dy + radius,
      });
    }
    tiles.push(row);
  }
  return tiles;
}

export async function getTileEmoji(tileType: string | undefined): Promise<string> {
  switch (tileType) {
    case "grass": return "🟩";
    case "dirt": return "🟫";
    case "road": return "⬜";
    case "forest": return "🌲";
    case "water": return "💧";
    case "hill": return "⛰️";
    case "wall": return "🟫";
    case "building": return "🏠";
    case "gate_north":
    case "gate_south":
    case "gate_east":
    case "gate_west": return "🚪";
    default: return "🟩";
  }
}

export function getTileName(tileType: string | undefined): string {
  switch (tileType) {
    case "grass": return "Трава";
    case "dirt": return "Земля";
    case "road": return "Дорога";
    case "forest": return "Лес";
    case "water": return "Вода";
    case "hill": return "Холм";
    case "wall": return "Стена";
    case "building": return "Здание";
    case "gate_north": return "Врата (Север)";
    case "gate_south": return "Врата (Юг)";
    case "gate_east": return "Врата (Восток)";
    case "gate_west": return "Врата (Запад)";
    default: return "Неизвестно";
  }
}

export async function canWalk(mapId: string, x: number, y: number): Promise<boolean> {
  const tile = await getTile(mapId, x, y);
  if (!tile) return false;
  return tile.walkable;
}

export async function getExits(mapId: string, x: number, y: number) {
  const exits: { direction: string; dx: number; dy: number; toMap?: string; toX?: number; toY?: number }[] = [];

  const directions = [
    { direction: "north", dx: 0, dy: -1, label: "⬆️" },
    { direction: "south", dx: 0, dy: 1, label: "⬇️" },
    { direction: "west", dx: -1, dy: 0, label: "⬅️" },
    { direction: "east", dx: 1, dy: 0, label: "➡️" },
  ];

  for (const dir of directions) {
    const tile = await getTile(mapId, x + dir.dx, y + dir.dy);
    if (tile && tile.walkable) {
      exits.push({
        direction: dir.direction,
        dx: dir.dx,
        dy: dir.dy,
        toMap: tile.transitionTo || undefined,
        toX: tile.transitionX || undefined,
        toY: tile.transitionY || undefined,
      });
    }
  }

  return exits;
}

export async function getTransitionAt(mapId: string, x: number, y: number) {
  const tile = await getTile(mapId, x, y);
  if (tile?.transitionTo) {
    return {
      toMap: tile.transitionTo,
      toX: tile.transitionX || 12,
      toY: tile.transitionY || 12,
    };
  }
  return null;
}

// Monster spawning
export async function getMonstersOnMap(mapId: string) {
  return db
    .select()
    .from(monsterInstances)
    .where(
      and(
        eq(monsterInstances.mapId, mapId),
        eq(monsterInstances.status, "alive")
      )
    );
}

export async function getMonsterWithTemplate(instanceId: number) {
  const instance = await db.query.monsterInstances.findFirst({
    where: eq(monsterInstances.id, instanceId),
  });
  if (!instance) return null;

  const template = await db.query.monsterTemplates.findFirst({
    where: eq(monsterTemplates.id, instance.templateId),
  });

  return { instance, template };
}

export async function getMonstersAtPosition(mapId: string, x: number, y: number) {
  const monsters = await db
    .select()
    .from(monsterInstances)
    .where(
      and(
        eq(monsterInstances.mapId, mapId),
        eq(monsterInstances.x, x),
        eq(monsterInstances.y, y),
        eq(monsterInstances.status, "alive")
      )
    );

  const result = [];
  for (const m of monsters) {
    const template = await db.query.monsterTemplates.findFirst({
      where: eq(monsterTemplates.id, m.templateId),
    });
    if (template) result.push({ instance: m, template });
  }
  return result;
}

export async function getNearbyMonsters(mapId: string, x: number, y: number, radius: number = 3) {
  const allMonsters = await getMonstersOnMap(mapId);
  const result = [];

  for (const m of allMonsters) {
    const dist = Math.abs(m.x - x) + Math.abs(m.y - y); // Manhattan distance
    if (dist <= radius) {
      const template = await db.query.monsterTemplates.findFirst({
        where: eq(monsterTemplates.id, m.templateId),
      });
      if (template) {
        result.push({
          instance: m,
          template,
          distance: dist,
          direction: getDirection(x, y, m.x, m.y),
        });
      }
    }
  }

  return result.sort((a, b) => a.distance - b.distance);
}

function getDirection(fromX: number, fromY: number, toX: number, toY: number): string {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const dirs: string[] = [];
  if (dy < 0) dirs.push("⬆️");
  if (dy > 0) dirs.push("⬇️");
  if (dx < 0) dirs.push("⬅️");
  if (dx > 0) dirs.push("➡️");
  return dirs.join("") || "📍";
}

// NPC management
export async function getNpcsOnMap(mapId: string) {
  return db.select().from(npcs).where(eq(npcs.mapId, mapId));
}

export async function getNearbyNpcs(mapId: string, x: number, y: number, radius: number = 3) {
  const allNpcs = await getNpcsOnMap(mapId);
  return allNpcs
    .map((n) => ({
      ...n,
      distance: Math.abs(n.x - x) + Math.abs(n.y - y),
      direction: getDirection(x, y, n.x, n.y),
    }))
    .filter((n) => n.distance <= radius)
    .sort((a, b) => a.distance - b.distance);
}

export async function getNpcsAtPosition(mapId: string, x: number, y: number) {
  return db
    .select()
    .from(npcs)
    .where(and(eq(npcs.mapId, mapId), eq(npcs.x, x), eq(npcs.y, y)));
}

// Monster spawning for maps
const MAP_MONSTER_SPAWNS: Record<string, { monsterId: string; count: number }[]> = {
  iz_ac02: [
    { monsterId: "poring", count: 8 },
    { monsterId: "fabre", count: 5 },
  ],
  prt_fild08: [
    { monsterId: "poring", count: 12 },
    { monsterId: "fabre", count: 8 },
    { monsterId: "lunatic", count: 6 },
    { monsterId: "drops", count: 6 },
  ],
  prt_fild01: [
    { monsterId: "fabre", count: 8 },
    { monsterId: "lunatic", count: 8 },
    { monsterId: "drops", count: 6 },
  ],
};

export async function spawnMonstersForMap(mapId: string) {
  const spawnConfig = MAP_MONSTER_SPAWNS[mapId];
  if (!spawnConfig) return;

  // Check current monster count
  const existing = await getMonstersOnMap(mapId);
  if (existing.length > 0) return; // Already spawned

  const map = await getMap(mapId);
  if (!map) return;

  for (const spawn of spawnConfig) {
    const template = await db.query.monsterTemplates.findFirst({
      where: eq(monsterTemplates.monsterId, spawn.monsterId),
    });
    if (!template) continue;

    for (let i = 0; i < spawn.count; i++) {
      // Find random walkable position
      let attempts = 0;
      let x, y;
      do {
        x = Math.floor(Math.random() * (map.width - 4)) + 2;
        y = Math.floor(Math.random() * (map.height - 4)) + 2;
        attempts++;
      } while (!(await canWalk(mapId, x, y)) && attempts < 50);

      if (attempts >= 50) continue;

      await db.insert(monsterInstances).values({
        templateId: template.id,
        mapId,
        x,
        y,
        currentHp: template.hp,
        maxHp: template.hp,
        status: "alive",
      });
    }
  }

  console.log(`Spawned monsters for ${mapId}`);
}

export async function respawnDeadMonsters() {
  const deadMonsters = await db
    .select()
    .from(monsterInstances)
    .where(and(eq(monsterInstances.status, "dead")));

  for (const m of deadMonsters) {
    if (m.respawnAt && new Date() >= m.respawnAt) {
      const template = await db.query.monsterTemplates.findFirst({
        where: eq(monsterTemplates.id, m.templateId),
      });
      if (!template) continue;

      // Find new position
      let attempts = 0;
      let x, y;
      do {
        x = Math.floor(Math.random() * 38) + 1;
        y = Math.floor(Math.random() * 38) + 1;
        attempts++;
      } while (!(await canWalk(m.mapId, x, y)) && attempts < 50);

      await db
        .update(monsterInstances)
        .set({
          x,
          y,
          currentHp: template.hp,
          status: "alive",
          respawnAt: null,
        })
        .where(eq(monsterInstances.id, m.id));
    }
  }
}

// Format minimap for display
export async function formatMinimap(
  mapId: string,
  playerX: number,
  playerY: number,
  radius: number = 3
): Promise<string> {
  const viewport = await getViewport(mapId, playerX, playerY, radius);
  const monstersNearby = await getNearbyMonsters(mapId, playerX, playerY, radius);
  const npcsNearby = await getNearbyNpcs(mapId, playerX, playerY, radius);

  let map = "";
  for (const row of viewport) {
    for (const cell of row) {
      if (cell.x === playerX && cell.y === playerY) {
        map += "👤";
      } else {
        // Check for monsters
        const monsterHere = monstersNearby.find(
          (m) => m.instance.x === cell.x && m.instance.y === cell.y
        );
        if (monsterHere) {
          map += getMonsterEmoji(monsterHere.template.monsterId);
        } else {
          // Check for NPCs
          const npcHere = npcsNearby.find(
            (n) => n.x === cell.x && n.y === cell.y
          );
          if (npcHere) {
            map += "🧙";
          } else {
            map += await getTileEmoji(cell.tile?.tileType);
          }
        }
      }
    }
    map += "\n";
  }

  return map;
}

function getMonsterEmoji(monsterId: string): string {
  switch (monsterId) {
    case "poring": return "🐷";
    case "fabre": return "🐛";
    case "lunatic": return "🐰";
    case "drops": return "🟠";
    default: return "❓";
  }
}

export function getMonsterName(monsterId: string): string {
  switch (monsterId) {
    case "poring": return "Поринг";
    case "fabre": return "Фабре";
    case "lunatic": return "Лунатик";
    case "drops": return "Дропс";
    default: return monsterId;
  }
}
