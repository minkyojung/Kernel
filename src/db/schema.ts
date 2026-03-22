import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(__dirname, "../../data.db");

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    initSchema();
  }
  return db;
}

function initSchema(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      platform TEXT NOT NULL CHECK(platform IN ('instagram', 'threads')),
      platform_user_id TEXT NOT NULL,
      username TEXT,
      access_token TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(platform, platform_user_id)
    );
  `);
}

export interface TokenRow {
  id: number;
  platform: "instagram" | "threads";
  platform_user_id: string;
  username: string | null;
  access_token: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export function upsertToken(
  platform: "instagram" | "threads",
  platformUserId: string,
  username: string | null,
  accessToken: string,
  expiresAt: Date,
): TokenRow {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO tokens (platform, platform_user_id, username, access_token, expires_at, updated_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(platform, platform_user_id) DO UPDATE SET
      username = excluded.username,
      access_token = excluded.access_token,
      expires_at = excluded.expires_at,
      updated_at = datetime('now')
    RETURNING *
  `);
  return stmt.get(
    platform,
    platformUserId,
    username,
    accessToken,
    expiresAt.toISOString(),
  ) as TokenRow;
}

export function getToken(
  platform: "instagram" | "threads",
): TokenRow | undefined {
  const db = getDb();
  return db
    .prepare("SELECT * FROM tokens WHERE platform = ? ORDER BY updated_at DESC LIMIT 1")
    .get(platform) as TokenRow | undefined;
}
