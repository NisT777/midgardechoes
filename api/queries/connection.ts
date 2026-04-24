import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { env } from "../lib/env";
import * as schema from "@db/schema";

const dbPath = env.databaseUrl || "./game.db";

let instance: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (!instance) {
    const sqlite = new Database(dbPath);
    instance = drizzle(sqlite, { schema });
  }
  return instance;
}
