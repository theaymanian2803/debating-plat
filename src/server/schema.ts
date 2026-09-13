export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS entries (
  id            TEXT PRIMARY KEY,
  kind          TEXT NOT NULL CHECK (kind IN ('verse', 'premise')),
  title         TEXT NOT NULL,
  original_text TEXT NOT NULL DEFAULT '',
  translation   TEXT NOT NULL DEFAULT '',
  category      TEXT NOT NULL DEFAULT '',
  sub_category  TEXT NOT NULL DEFAULT '',
  reference     TEXT NOT NULL DEFAULT '',
  sections      TEXT NOT NULL DEFAULT '[]',
  map           TEXT NOT NULL DEFAULT '{}',
  sort_order    INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS commentaries (
  id          TEXT PRIMARY KEY,
  entry_id    TEXT NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  scholar     TEXT NOT NULL DEFAULT '',
  text        TEXT NOT NULL DEFAULT '',
  book        TEXT NOT NULL DEFAULT '',
  volume_page TEXT NOT NULL DEFAULT '',
  source_ref  TEXT NOT NULL DEFAULT '',
  status      TEXT NOT NULL CHECK (status IN ('verified', 'disputed', 'unverified')),
  seeded      INTEGER NOT NULL DEFAULT 0,
  sort_order  INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS rebuttals (
  id           TEXT PRIMARY KEY,
  entry_id     TEXT NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  opponent     TEXT NOT NULL DEFAULT '',
  stance       TEXT NOT NULL DEFAULT '',
  text         TEXT NOT NULL DEFAULT '',
  counter_refs TEXT NOT NULL DEFAULT '',
  status       TEXT NOT NULL CHECK (status IN ('verified', 'disputed', 'unverified')),
  counter      TEXT,
  citations    TEXT NOT NULL DEFAULT '[]',
  sort_order   INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS sources (
  id         TEXT PRIMARY KEY,
  label      TEXT NOT NULL,
  detail     TEXT NOT NULL DEFAULT '',
  kind       TEXT NOT NULL CHECK (kind IN ('book', 'article', 'manuscript', 'scholar')),
  status     TEXT NOT NULL CHECK (status IN ('verified', 'pending', 'unverified')),
  archive    TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS categories (
  id         TEXT PRIMARY KEY,
  label      TEXT NOT NULL,
  subs       TEXT NOT NULL DEFAULT '[]',
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS tags (
  id    TEXT PRIMARY KEY,
  label TEXT NOT NULL UNIQUE
);
CREATE TABLE IF NOT EXISTS entry_tags (
  entry_id TEXT NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  tag_id   TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (entry_id, tag_id)
);
`;

export async function migrate(db: { execute(sql: string): Promise<unknown> }) {
  // The libsql HTTP API rejects multi-statement strings, so run them one at a time.
  for (const stmt of SCHEMA_SQL.split(";")) {
    const sql = stmt.trim();
    if (sql) await db.execute(sql);
  }
}
