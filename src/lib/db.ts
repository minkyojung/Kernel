import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "data.db");

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

    CREATE TABLE IF NOT EXISTS media (
      id TEXT PRIMARY KEY,
      platform TEXT NOT NULL DEFAULT 'instagram',
      media_type TEXT NOT NULL,
      caption TEXT,
      permalink TEXT,
      media_url TEXT,
      timestamp TEXT NOT NULL,
      like_count INTEGER DEFAULT 0,
      comments_count INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS profile (
      id INTEGER PRIMARY KEY CHECK(id = 1),
      category TEXT NOT NULL DEFAULT '',
      target_audience TEXT NOT NULL DEFAULT '',
      content_goal TEXT NOT NULL DEFAULT 'growth',
      primary_format TEXT NOT NULL DEFAULT 'mixed',
      posting_frequency TEXT NOT NULL DEFAULT '3_per_week',
      competitors TEXT NOT NULL DEFAULT '[]',
      bio TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS drafts (
      id TEXT PRIMARY KEY,
      source_type TEXT NOT NULL DEFAULT 'manual',
      platform TEXT NOT NULL DEFAULT 'threads',
      format TEXT NOT NULL DEFAULT 'thread',
      title TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      scheduled_at TEXT,
      published_at TEXT,
      published_id TEXT,
      error TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS content_patterns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pattern_type TEXT NOT NULL CHECK(pattern_type IN ('topic', 'format', 'tone', 'timing', 'hook', 'general')),
      pattern TEXT NOT NULL,
      evidence TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS media_insights (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      media_id TEXT NOT NULL REFERENCES media(id),
      reach INTEGER DEFAULT 0,
      views INTEGER DEFAULT 0,
      saved INTEGER DEFAULT 0,
      shares INTEGER DEFAULT 0,
      total_interactions INTEGER DEFAULT 0,
      likes INTEGER DEFAULT 0,
      comments INTEGER DEFAULT 0,
      plays INTEGER DEFAULT 0,
      fetched_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(media_id)
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

export interface MediaRow {
  id: string;
  platform: string;
  media_type: string;
  caption: string | null;
  permalink: string | null;
  media_url: string | null;
  timestamp: string;
  like_count: number;
  comments_count: number;
}

export interface MediaInsightRow {
  media_id: string;
  reach: number;
  views: number;
  saved: number;
  shares: number;
  total_interactions: number;
  likes: number;
  comments: number;
  plays: number;
  fetched_at: string;
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
    .prepare(
      "SELECT * FROM tokens WHERE platform = ? ORDER BY updated_at DESC LIMIT 1",
    )
    .get(platform) as TokenRow | undefined;
}

export function upsertMedia(media: MediaRow): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO media (id, platform, media_type, caption, permalink, media_url, timestamp, like_count, comments_count, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(id) DO UPDATE SET
      like_count = excluded.like_count,
      comments_count = excluded.comments_count,
      media_url = excluded.media_url,
      updated_at = datetime('now')
  `).run(
    media.id,
    media.platform,
    media.media_type,
    media.caption,
    media.permalink,
    media.media_url,
    media.timestamp,
    media.like_count,
    media.comments_count,
  );
}

export function upsertMediaInsight(insight: MediaInsightRow): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO media_insights (media_id, reach, views, saved, shares, total_interactions, likes, comments, plays, fetched_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(media_id) DO UPDATE SET
      reach = excluded.reach,
      views = excluded.views,
      saved = excluded.saved,
      shares = excluded.shares,
      total_interactions = excluded.total_interactions,
      likes = excluded.likes,
      comments = excluded.comments,
      plays = excluded.plays,
      fetched_at = datetime('now')
  `).run(
    insight.media_id,
    insight.reach,
    insight.views,
    insight.saved,
    insight.shares,
    insight.total_interactions,
    insight.likes,
    insight.comments,
    insight.plays,
  );
}

export function getAllMediaWithInsights(): (MediaRow & Partial<MediaInsightRow>)[] {
  const db = getDb();
  return db.prepare(`
    SELECT m.*, mi.reach, mi.views, mi.saved, mi.shares,
           mi.total_interactions, mi.likes as insight_likes,
           mi.comments as insight_comments, mi.plays, mi.fetched_at
    FROM media m
    LEFT JOIN media_insights mi ON m.id = mi.media_id
    ORDER BY m.timestamp DESC
  `).all() as (MediaRow & Partial<MediaInsightRow>)[];
}

export function deleteRemovedMedia(currentIds: string[]): number {
  const db = getDb();
  if (currentIds.length === 0) {
    const result = db.prepare("DELETE FROM media_insights").run();
    const result2 = db.prepare("DELETE FROM media").run();
    return result2.changes;
  }
  const placeholders = currentIds.map(() => "?").join(",");
  db.prepare(`DELETE FROM media_insights WHERE media_id NOT IN (${placeholders})`).run(...currentIds);
  const result = db.prepare(`DELETE FROM media WHERE id NOT IN (${placeholders})`).run(...currentIds);
  return result.changes;
}

export function getMediaWithInsight(mediaId: string): (MediaRow & Partial<MediaInsightRow>) | undefined {
  const db = getDb();
  return db.prepare(`
    SELECT m.*, mi.reach, mi.views, mi.saved, mi.shares,
           mi.total_interactions, mi.likes as insight_likes,
           mi.comments as insight_comments, mi.plays, mi.fetched_at
    FROM media m
    LEFT JOIN media_insights mi ON m.id = mi.media_id
    WHERE m.id = ?
  `).get(mediaId) as (MediaRow & Partial<MediaInsightRow>) | undefined;
}

export interface ProfileRow {
  id: number;
  category: string;
  target_audience: string;
  content_goal: string;
  primary_format: string;
  posting_frequency: string;
  competitors: string; // JSON array
  bio: string;
  created_at: string;
  updated_at: string;
}

export function getProfile(): ProfileRow | undefined {
  const db = getDb();
  return db.prepare("SELECT * FROM profile WHERE id = 1").get() as ProfileRow | undefined;
}

export function upsertProfile(data: Omit<ProfileRow, "id" | "created_at" | "updated_at">): ProfileRow {
  const db = getDb();
  return db.prepare(`
    INSERT INTO profile (id, category, target_audience, content_goal, primary_format, posting_frequency, competitors, bio, updated_at)
    VALUES (1, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(id) DO UPDATE SET
      category = excluded.category,
      target_audience = excluded.target_audience,
      content_goal = excluded.content_goal,
      primary_format = excluded.primary_format,
      posting_frequency = excluded.posting_frequency,
      competitors = excluded.competitors,
      bio = excluded.bio,
      updated_at = datetime('now')
    RETURNING *
  `).get(
    data.category,
    data.target_audience,
    data.content_goal,
    data.primary_format,
    data.posting_frequency,
    data.competitors,
    data.bio,
  ) as ProfileRow;
}

// --- Drafts ---

export interface DraftRow {
  id: string;
  source_type: string;
  platform: string;
  format: string;
  title: string;
  content: string;
  status: string;
  scheduled_at: string | null;
  published_at: string | null;
  published_id: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
}

export function createDraft(draft: {
  id: string;
  source_type: string;
  platform: string;
  format: string;
  title: string;
  content: string;
  scheduled_at?: string;
}): DraftRow {
  const db = getDb();
  return db.prepare(`
    INSERT INTO drafts (id, source_type, platform, format, title, content, status, scheduled_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    RETURNING *
  `).get(
    draft.id,
    draft.source_type,
    draft.platform,
    draft.format,
    draft.title,
    draft.content,
    draft.scheduled_at ? "scheduled" : "draft",
    draft.scheduled_at || null,
  ) as DraftRow;
}

export function getAllDrafts(): DraftRow[] {
  const db = getDb();
  return db.prepare("SELECT * FROM drafts ORDER BY created_at DESC").all() as DraftRow[];
}

export function getDraft(id: string): DraftRow | undefined {
  const db = getDb();
  return db.prepare("SELECT * FROM drafts WHERE id = ?").get(id) as DraftRow | undefined;
}

export function updateDraftStatus(
  id: string,
  status: string,
  extra?: { published_id?: string; published_at?: string; error?: string },
): void {
  const db = getDb();
  db.prepare(`
    UPDATE drafts SET status = ?, published_id = ?, published_at = ?, error = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(status, extra?.published_id || null, extra?.published_at || null, extra?.error || null, id);
}

export function updateDraftContent(id: string, content: string, title?: string): void {
  const db = getDb();
  if (title !== undefined) {
    db.prepare("UPDATE drafts SET content = ?, title = ?, updated_at = datetime('now') WHERE id = ?").run(content, title, id);
  } else {
    db.prepare("UPDATE drafts SET content = ?, updated_at = datetime('now') WHERE id = ?").run(content, id);
  }
}

export function updateDraftSchedule(id: string, scheduled_at: string | null): void {
  const db = getDb();
  db.prepare(`
    UPDATE drafts SET scheduled_at = ?, status = ?, updated_at = datetime('now') WHERE id = ?
  `).run(scheduled_at, scheduled_at ? "scheduled" : "draft", id);
}

export function getDueScheduledDrafts(): DraftRow[] {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM drafts
    WHERE status = 'scheduled' AND scheduled_at <= datetime('now')
    ORDER BY scheduled_at ASC
  `).all() as DraftRow[];
}

export function deleteDraft(id: string): void {
  const db = getDb();
  db.prepare("DELETE FROM drafts WHERE id = ?").run(id);
}

// --- Content Patterns ---

export interface ContentPatternRow {
  id: number;
  pattern_type: string;
  pattern: string;
  evidence: string; // JSON array of post references
  created_at: string;
  updated_at: string;
}

export function replaceAllPatterns(patterns: { pattern_type: string; pattern: string; evidence: string }[]): void {
  const db = getDb();
  const trx = db.transaction(() => {
    db.prepare("DELETE FROM content_patterns").run();
    const stmt = db.prepare(
      "INSERT INTO content_patterns (pattern_type, pattern, evidence) VALUES (?, ?, ?)",
    );
    for (const p of patterns) {
      stmt.run(p.pattern_type, p.pattern, p.evidence);
    }
  });
  trx();
}

export function getAllPatterns(): ContentPatternRow[] {
  const db = getDb();
  return db.prepare("SELECT * FROM content_patterns ORDER BY pattern_type, id").all() as ContentPatternRow[];
}
