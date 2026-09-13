# TursoDB Persistence — Design

Date: 2026-09-13
Status: Approved (design review)

## Problem

All corpus data lives in browser `localStorage` under `scholia-admin-v1`. It is
per-browser, unreachable by server code, not shared across devices, and gone the
moment storage is cleared. The app deploys to Cloudflare Workers, so it is
positioned to own its data server-side.

## Goal

Replace localStorage persistence with a relational TursoDB (libSQL over HTTPS)
as the single source of truth for the corpus. The reading room reads from the
DB; admin edits write to the DB through targeted server functions. No offline
mode: admin saves are server round-trips.

Non-goals (later tasks, out of scope):
- Admin authentication / access control.
- Migrating existing localStorage data (the seeded corpus is the initial data).

## Architecture

```
browser (reading room)         browser (admin)
        │  useQuery(getCorpus)        │  mutations (upsert/delete ...)
        ▼                             ▼
   TanStack Start server functions  (src/server/corpus.ts)
        ▼
   src/server/rows.ts   (pure: AdminData <-> relational rows)
        ▼
   src/server/db.ts     (Turso client via @libsql/client/web + schema migration)
        ▼
   TursoDB (libsql://debate-unccode.aws-eu-west-1.turso.io)
```

Data flow:

- **Read (public + admin):** `getCorpus()` server function disassembles the
  relational tables into the existing `AdminData` shape. On first read of an
  empty database it seeds the corpus inside a transaction.
- **Write (admin):** each form save/delete calls a targeted server function
  (`upsertEntry`, `deleteEntry`, `upsertCommentary`, ...). Mutations run in a
  transaction and return the updated `AdminData`, which the caller uses to
  refresh local state (React Query invalidation).

## 1. Schema

SQL migration (`src/server/schema.ts`), idempotent `CREATE TABLE IF NOT EXISTS`,
run lazily on client creation.

```sql
CREATE TABLE IF NOT EXISTS entries (
  id            TEXT PRIMARY KEY,
  kind          TEXT NOT NULL CHECK (kind IN ('verse', 'premise')),
  title         TEXT NOT NULL,
  original_text TEXT NOT NULL DEFAULT '',
  translation   TEXT NOT NULL DEFAULT '',
  category_id   TEXT NOT NULL,
  sub_category  TEXT NOT NULL DEFAULT '',
  reference     TEXT NOT NULL DEFAULT '',
  sections      TEXT NOT NULL DEFAULT '[]',  -- JSON CommentarySection[]
  map           TEXT NOT NULL DEFAULT '{}',  -- JSON { nodes, edges }
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
  status      TEXT NOT NULL CHECK (status IN ('verified','disputed','unverified')),
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
  status       TEXT NOT NULL CHECK (status IN ('verified','disputed','unverified')),
  counter      TEXT,                       -- JSON or NULL
  citations    TEXT NOT NULL DEFAULT '[]', -- JSON Citation[]
  sort_order   INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sources (
  id      TEXT PRIMARY KEY,
  label   TEXT NOT NULL,
  detail  TEXT NOT NULL DEFAULT '',
  kind    TEXT NOT NULL CHECK (kind IN ('book','article','manuscript','scholar')),
  status  TEXT NOT NULL CHECK (status IN ('verified','pending','unverified')),
  archive TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS categories (
  id         TEXT PRIMARY KEY,
  label      TEXT NOT NULL,
  subs       TEXT NOT NULL DEFAULT '[]', -- JSON string[]
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
```

Design notes:

- Normalized entities are rows; volatile sub-structures (`sections`, `map`,
  `counter`, `citations`, category `subs`) are JSON columns — a pragmatic
  middle ground that keeps joins minimal without denormalizing everything.
- `sort_order` preserves the stable array ordering the UI relies on (sidebar,
  lists). New rows append at the end (`max(sort_order)+1`).
- `entry_tags` is the only true join table; tags are deduplicated by label.
- Deletes cascade: removing an entry removes its commentaries, rebuttals, and
  tag links.

## 2. Server layer

### `src/server/db.ts`

- `createClient()` returns a Turso client using `@libsql/client/web` (works in
  Node dev and the Cloudflare Worker).
- Credentials from `getCloudflareContext().env.TURSO_URL` /
  `.TURSO_AUTH_TOKEN` in production; fall back to `process.env` in dev. Verify
  the exact `getCloudflareContext` API for the installed TanStack Start version
  during implementation; if unavailable, read `process.env` and pass bindings
  through Nitro.
- On first use, runs `migrate()` (schema SQL above).

### `src/server/rows.ts` (pure, unit-testable)

- `adminDataToRows(data: AdminData)` → insert-shaped payloads for every table.
- `rowsToAdminData(...)` → assembles `AdminData` from query results with
  correct ordering and tag joins.
- `applySeed(db)` → inserts `seedData()` within a transaction.

### `src/server/corpus.ts` (TanStack Start server functions)

- `getCorpus(): Promise<AdminData>` — seeds if empty, then assembles and
  returns.
- Mutations, each transactional, each returning `AdminData`:
  - `upsertEntry`, `deleteEntry`
  - `upsertCommentary`, `deleteCommentary`
  - `upsertRebuttal`, `deleteRebuttal`
  - `upsertSource`, `deleteSource`
  - `upsertCategory`, `deleteCategory`
  - `upsertTag`, `deleteTag`
  - `resetCorpus()` — clears all tables and re-seeds.

All functions are `createServerFn` with `method: "POST"`.

## 3. Admin refactor

- `src/routes/admin.tsx` hydrates via `getCorpus()` using React Query
  (`useQuery`). `AdminContext` continues to expose `data`, but the whole-document
  `update(fn)` / localStorage persist effect is removed.
- Each admin page replaces its inline `update((d) => ...)` calls with the
  matching server mutation (`useMutation`), invalidating the corpus query on
  success:
  - entries page → `upsertEntry` / `deleteEntry`
  - commentaries → `upsertCommentary` / `deleteCommentary`
  - rebuttals → `upsertRebuttal` / `deleteRebuttal`
  - sources → `upsertSource` / `deleteSource`
  - taxonomy → `upsertCategory` / `deleteCategory` / `upsertTag` / `deleteTag`
  - admin sidebar "Reset to sample corpus" → `resetCorpus`
- `AdminContext` no longer persists anything; all writes are server mutations.
- `normalizeAdminData` is dropped from the load path (server-assembled data is
  always complete). It may remain for defensive use if desired; default: remove
  its load-path usages.

## 4. Reading room

- `src/lib/use-corpus.ts` switches from localStorage to
  `useQuery({ queryKey: ["corpus"], queryFn: getCorpus })`; keeps
  `adminToEntries` / `collectionsFor` adapters. The empty-corpus branch already
  exists in the UI.

## 5. Env & setup

- New dependency: `@libsql/client`.
- `.dev.vars` (gitignored):
  - `TURSO_URL=libsql://debate-unccode.aws-eu-west-1.turso.io`
  - `TURSO_AUTH_TOKEN=<token>`
- Cloudflare: `wrangler secret put TURSO_URL` and `wrangler secret put
  TURSO_AUTH_TOKEN` (or set in the dashboard → Workers → Settings → Variables).
- Verify how the dev server surfaces `.dev.vars` to server functions (Nitro
  convention); fall back to reading the file explicitly in dev if needed.
- Credential note: the current token was shared in chat and grants write
  access; rotate it after setup (Turso dashboard → Tokens). Store secrets
  only in `.dev.vars` / Worker secrets, never in committed files.

## 6. Testing & verification

- **Unit (vitest, node):** `rows.ts` mapping — `adminDataToRows` /
  `rowsToAdminData` round-trip against `seedData()`, tag join correctness,
  ordering, cascading delete shapes, JSON column serialize/parse.
- **Integration (vitest, node):** `getCorpus()` seeds an empty DB and round-trips
  via a real client against the Turso database (credentials from env). Uses the
  real DB; `resetCorpus()` restores seed state afterward.
- **Manual:** dev server — home renders from DB; admin CRUD persists across a
  reload; a second load of `/` reflects admin changes.
- **Regression:** existing unit tests (adapter, store, nav) stay green; build
  (`npm run build`) and lint pass.