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
CREATE TABLE IF NOT EXISTS source_requests (
  id          TEXT PRIMARY KEY,
  entry_id    TEXT NOT NULL DEFAULT '',
  target      TEXT NOT NULL DEFAULT '',
  proposal    TEXT NOT NULL DEFAULT '',
  archive     TEXT NOT NULL DEFAULT '',
  note        TEXT NOT NULL DEFAULT '',
  status      TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'dismissed')),
  created_at  INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS audit_log (
  id        TEXT PRIMARY KEY,
  at        INTEGER NOT NULL DEFAULT 0,
  actor     TEXT NOT NULL DEFAULT 'admin',
  action    TEXT NOT NULL,
  entity    TEXT NOT NULL DEFAULT '',
  entity_id TEXT NOT NULL DEFAULT '',
  summary   TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS votes (
  id          TEXT PRIMARY KEY,
  target_type TEXT NOT NULL,
  target_id   TEXT NOT NULL,
  client_id   TEXT NOT NULL,
  direction   INTEGER NOT NULL,
  created_at  INTEGER NOT NULL DEFAULT 0,
  UNIQUE (target_type, target_id, client_id)
);
CREATE TABLE IF NOT EXISTS paths (
  id         TEXT PRIMARY KEY,
  title      TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  entry_ids  TEXT NOT NULL DEFAULT '[]',
  sort_order INTEGER NOT NULL DEFAULT 0
);
`;

type Executor = {
  execute(stmt: string | { sql: string; args?: unknown[] }): Promise<unknown>;
};

const ensureColumn = async (
  db: Executor,
  table: string,
  column: string,
  declaration: string,
): Promise<void> => {
  const res = (await db.execute(`PRAGMA table_info(${table})`)) as {
    rows: { name: string }[];
  };
  if (!res.rows.some((r) => r.name === column)) {
    await db.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${declaration}`);
  }
};

export async function migrate(db: Executor) {
  // The libsql HTTP API rejects multi-statement strings, so run them one at a time.
  for (const stmt of SCHEMA_SQL.split(";")) {
    const sql = stmt.trim();
    if (sql) await db.execute(sql);
  }
  await ensureColumn(db, "entries", "translations", "TEXT NOT NULL DEFAULT '[]'");
  await ensureColumn(db, "entries", "related", "TEXT NOT NULL DEFAULT '[]'");
  await ensureColumn(db, "rebuttals", "warrant", "TEXT NOT NULL DEFAULT ''");
  await ensureColumn(db, "rebuttals", "backing", "TEXT NOT NULL DEFAULT ''");
  await ensureColumn(db, "rebuttals", "qualifier", "TEXT NOT NULL DEFAULT ''");
}
