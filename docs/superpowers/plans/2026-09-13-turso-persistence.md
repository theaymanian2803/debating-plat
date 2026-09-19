# TursoDB Persistence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace browser `localStorage` corpus persistence with a relational TursoDB backend accessed through TanStack Start server functions, so the reading room and admin share one server-side source of truth.

**Architecture:** A server layer (`src/server/`) owns the Turso client, schema migration, and pure `AdminData`↔relational-row mapping. TanStack Start server functions (`src/lib/corpus-api.ts`) expose `getCorpus` + targeted mutations to the browser. The reading room reads via React Query; the admin writes via mutations and drops localStorage entirely.

**Tech Stack:** `@libsql/client/web` (Turso over HTTPS), TanStack Start `createServerFn`, React Query, Cloudflare Workers (Nitro cloudflare-module preset), existing vitest + Tailwind + TanStack Router setup.

**Spec:** `docs/superpowers/specs/2026-09-13-turso-persistence-design.md`

## Global Constraints

- Credentials (`TURSO_URL`, `TURSO_AUTH_TOKEN`) live ONLY in `.dev.vars` (already gitignored) and Cloudflare Worker secrets — never in committed files.
- DB host: `libsql://debate-unccode.aws-eu-west-1.turso.io` (already created; connectivity verified via HTTP pipeline).
- `@libsql/client` version: latest (`^0.18.0`).
- Vitest config already includes `src/**/*.test.ts`; integration tests are gated behind `RUN_TURSO_INTEGRATION=1` so `npm test` never touches real data.
- Client code must not import from `src/server/**` except through server-fn modules, per vite `importProtection` (`files: ["**/server/**"]`). Server-fn handler bodies (and the imports they use) are stripped client-side.
- **Spec delta (approved during planning):** `entries.category` is a TEXT label (matching how the app already renames categories by label), not a `category_id` FK. `tags.id` equals the tag label. All other spec tables are unchanged.
- Line endings: new files use LF. Run `npx eslint <files>` after edits; pre-existing CRLF noise in files not touched here is out of scope.

---

### Task 1: Add `@libsql/client` and local env

**Files:**
- Modify: `package.json`
- Create: `.dev.vars` (gitignored — never committed)

**Interfaces:**
- Produces: `@libsql/client` dependency; `.dev.vars` with `TURSO_URL` and `TURSO_AUTH_TOKEN`.

- [ ] **Step 1: Install the client**

```bash
npm install @libsql/client
npx --yes bun install
```

Expected: both `package-lock.json` and `bun.lock` gain `@libsql/client`, and `node_modules/@libsql/client/web` resolves.

- [ ] **Step 2: Create `.dev.vars`**

Create `C:\Users\sbere\OneDrive\Desktop\deb\.dev.vars` with exactly:

```
TURSO_URL=libsql://debate-unccode.aws-eu-west-1.turso.io
TURSO_AUTH_TOKEN=<redacted — set in .dev.vars / Vercel env, never committed>
```

- [ ] **Step 3: Verify it is ignored**

```bash
git check-ignore .dev.vars
```

Expected: prints the path (`.dev.vars` is ignored). If not, add `.dev.vars` to `.gitignore`.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json bun.lock
git commit -m "chore: add @libsql/client"
```

---

### Task 2: `src/server/env.ts` — credential resolution

**Files:**
- Create: `src/server/env.ts`
- Test: `src/server/__tests__/env.test.ts`

**Interfaces:**
- Produces: `setCloudflareEnv(env: unknown)`, `getStashedCloudflareEnv(): Record<string, unknown> | undefined`, `parseDevVarsFile(text: string): Record<string, string>`, `resolveTursoCredentials(src: CredentialSource): { url: string; token: string }`.
- `CredentialSource = { cloudflare?: Record<string, unknown>; processEnv?: Record<string, string | undefined>; readFile?: (path: string) => string | undefined }`.

- [ ] **Step 1: Write the failing test**

`src/server/__tests__/env.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { parseDevVarsFile, resolveTursoCredentials } from "@/server/env";

describe("parseDevVarsFile", () => {
  it("parses KEY=VALUE lines", () => {
    expect(parseDevVarsFile("TURSO_URL=x\nTURSO_AUTH_TOKEN=y\n")).toEqual({
      TURSO_URL: "x",
      TURSO_AUTH_TOKEN: "y",
    });
  });

  it("ignores comments and blank lines", () => {
    expect(parseDevVarsFile("# comment\n\nA=1\n")).toEqual({ A: "1" });
  });

  it("keeps values containing '='", () => {
    expect(parseDevVarsFile("URL=libsql://db?tls=1\n")).toEqual({ URL: "libsql://db?tls=1" });
  });
});

describe("resolveTursoCredentials", () => {
  it("prefers cloudflare bindings", () => {
    const creds = resolveTursoCredentials({
      cloudflare: { TURSO_URL: "cf-url", TURSO_AUTH_TOKEN: "cf-tok" },
      processEnv: { TURSO_URL: "env-url", TURSO_AUTH_TOKEN: "env-tok" },
      readFile: () => undefined,
    });
    expect(creds).toEqual({ url: "cf-url", token: "cf-tok" });
  });

  it("falls back to process.env", () => {
    const creds = resolveTursoCredentials({
      cloudflare: undefined,
      processEnv: { TURSO_URL: "env-url", TURSO_AUTH_TOKEN: "env-tok" },
      readFile: () => undefined,
    });
    expect(creds).toEqual({ url: "env-url", token: "env-tok" });
  });

  it("falls back to .dev.vars", () => {
    const creds = resolveTursoCredentials({
      cloudflare: undefined,
      processEnv: {},
      readFile: () => "TURSO_URL=dev-url\nTURSO_AUTH_TOKEN=dev-tok\n",
    });
    expect(creds).toEqual({ url: "dev-url", token: "dev-tok" });
  });

  it("throws when nothing is available", () => {
    expect(() =>
      resolveTursoCredentials({ cloudflare: undefined, processEnv: {}, readFile: () => undefined }),
    ).toThrow(/Turso credentials/);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx vitest run src/server/__tests__/env.test.ts
```

Expected: FAIL — `Cannot find module '@/server/env'`.

- [ ] **Step 3: Implement `src/server/env.ts`**

```ts
let cloudflareEnv: Record<string, unknown> | undefined;

export function setCloudflareEnv(env: unknown) {
  cloudflareEnv = (env ?? undefined) as Record<string, unknown> | undefined;
}

export function getStashedCloudflareEnv() {
  return cloudflareEnv;
}

export function parseDevVarsFile(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of text.split(/\r?\n/)) {
    if (line.trim() === "" || line.trim().startsWith("#")) continue;
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
    if (m) out[m[1]!] = m[2] ?? "";
  }
  return out;
}

export type CredentialSource = {
  cloudflare?: Record<string, unknown>;
  processEnv?: Record<string, string | undefined>;
  readFile?: (path: string) => string | undefined;
};

export function resolveTursoCredentials(src: CredentialSource): { url: string; token: string } {
  const cf = src.cloudflare;
  const url = typeof cf?.TURSO_URL === "string" ? cf.TURSO_URL : src.processEnv?.TURSO_URL;
  const token =
    typeof cf?.TURSO_AUTH_TOKEN === "string"
      ? cf.TURSO_AUTH_TOKEN
      : src.processEnv?.TURSO_AUTH_TOKEN;
  if (url && token) return { url, token };

  const dev = src.readFile?.(".dev.vars");
  if (dev) {
    const vars = parseDevVarsFile(dev);
    if (vars.TURSO_URL && vars.TURSO_AUTH_TOKEN) {
      return { url: vars.TURSO_URL, token: vars.TURSO_AUTH_TOKEN };
    }
  }

  throw new Error("Turso credentials not found (set TURSO_URL and TURSO_AUTH_TOKEN, or .dev.vars)");
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx vitest run src/server/__tests__/env.test.ts
```

Expected: PASS (5 tests).

- [ ] **Step 5: Lint and commit**

```bash
npx eslint src/server/env.ts src/server/__tests__/env.test.ts
git add src/server/env.ts src/server/__tests__/env.test.ts
git commit -m "feat: resolve Turso credentials from cloudflare/env/.dev.vars"
```

---

### Task 3: `src/server/schema.ts` — migration SQL

**Files:**
- Create: `src/server/schema.ts`

**Interfaces:**
- Produces: `SCHEMA_SQL: string`, `migrate(db: { execute(sql: string): Promise<unknown> }): Promise<void>`.

- [ ] **Step 1: Implement `src/server/schema.ts`**

```ts
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
  await db.execute(SCHEMA_SQL);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/server/schema.ts
git commit -m "feat: add Turso schema migration"
```

---

### Task 4: `src/server/db.ts` — Turso client singleton

**Files:**
- Create: `src/server/db.ts`

**Interfaces:**
- Consumes: `resolveTursoCredentials` (Task 2), `getStashedCloudflareEnv` (Task 2), `migrate` (Task 3).
- Produces: `getDb(): Promise<Client>` (singleton; lazily creates client from credentials and runs migration). `Client` from `@libsql/client/web`.

- [ ] **Step 1: Implement `src/server/db.ts`**

```ts
import { createClient, type Client } from "@libsql/client/web";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getStashedCloudflareEnv, resolveTursoCredentials } from "./env";
import { migrate } from "./schema";

let clientPromise: Promise<Client> | undefined;

export function getDb(): Promise<Client> {
  if (!clientPromise) {
    clientPromise = (async () => {
      const { url, token } = resolveTursoCredentials({
        cloudflare: getStashedCloudflareEnv(),
        processEnv: process.env,
        readFile: (p) => {
          try {
            return readFileSync(join(process.cwd(), p), "utf8");
          } catch {
            return undefined;
          }
        },
      });
      const client = createClient({ url, authToken: token });
      await migrate(client);
      return client;
    })();
  }
  return clientPromise;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/server/db.ts
git commit -m "feat: add Turso client singleton"
```

---

### Task 5: `src/server/rows.ts` — pure AdminData↔row mapping

**Files:**
- Create: `src/server/rows.ts`
- Test: `src/server/__tests__/rows.test.ts`

**Interfaces:**
- Consumes: `AdminData` and entity types from `@/lib/admin-store`.
- Produces:
  - `type Row = Record<string, unknown>`
  - `type DbSnapshot = { entries: Row[]; commentaries: Row[]; rebuttals: Row[]; sources: Row[]; categories: Row[]; tags: Row[]; entryTags: Row[] }`
  - `adminDataToRows(data: AdminData): DbSnapshot`
  - `rowsToAdminData(snap: DbSnapshot): AdminData`
  - `seedRows(): DbSnapshot`

- [ ] **Step 1: Write the failing test**

`src/server/__tests__/rows.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { adminDataToRows, rowsToAdminData } from "@/server/rows";
import { seedData } from "@/lib/admin-store";

describe("rows round-trip", () => {
  it("round-trips seed data", () => {
    const data = seedData();
    expect(rowsToAdminData(adminDataToRows(data))).toEqual(data);
  });

  it("keeps entry order via sort_order", () => {
    const data = seedData();
    const rows = adminDataToRows(data);
    expect(rows.entries.map((r) => r.id)).toEqual(data.entries.map((e) => e.id));
    expect(rows.rebuttals.map((r) => r.sort_order)).toEqual(data.rebuttals.map((_, i) => i));
  });

  it("maps entry tags through the join", () => {
    const data = seedData();
    const rows = adminDataToRows(data);
    const first = data.entries[0]!;
    const links = rows.entryTags.filter((t) => t.entry_id === first.id).map((t) => t.tag_id);
    expect(new Set(links)).toEqual(new Set(first.tags));
  });

  it("serializes JSON columns", () => {
    const data = seedData();
    const rows = adminDataToRows(data);
    expect(JSON.parse(rows.entries[0]!.sections as string)).toEqual(data.entries[0]!.sections);
    expect(JSON.parse(rows.entries[0]!.map as string)).toEqual(data.entries[0]!.map);
    expect(JSON.parse(rows.rebuttals[0]!.citations as string)).toEqual(data.rebuttals[0]!.citations);
  });

  it("handles an empty corpus", () => {
    const data = seedData();
    data.entries = [];
    data.commentaries = [];
    data.rebuttals = [];
    data.sources = [];
    data.categories = [];
    data.tags = [];
    expect(rowsToAdminData(adminDataToRows(data))).toEqual(data);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx vitest run src/server/__tests__/rows.test.ts
```

Expected: FAIL — `Cannot find module '@/server/rows'`.

- [ ] **Step 3: Implement `src/server/rows.ts`**

```ts
import type {
  AdminData,
  AdminEntry,
  AdminCommentary,
  AdminRebuttal,
  AdminSource,
  AdminCategory,
} from "@/lib/admin-store";

export type Row = Record<string, unknown>;

export type DbSnapshot = {
  entries: Row[];
  commentaries: Row[];
  rebuttals: Row[];
  sources: Row[];
  categories: Row[];
  tags: Row[];
  entryTags: Row[];
};

export function adminDataToRows(data: AdminData): DbSnapshot {
  const entries: Row[] = data.entries.map((e, i) => ({
    id: e.id,
    kind: e.kind,
    title: e.title,
    original_text: e.originalText,
    translation: e.translation,
    category: e.category,
    sub_category: e.subCategory,
    reference: e.reference,
    sections: JSON.stringify(e.sections),
    map: JSON.stringify(e.map),
    sort_order: i,
  }));

  const commentaries: Row[] = data.commentaries.map((c, i) => ({
    id: c.id,
    entry_id: c.entryId,
    scholar: c.scholar,
    text: c.text,
    book: c.book,
    volume_page: c.volumePage,
    source_ref: c.sourceRef,
    status: c.status,
    seeded: c.seeded ? 1 : 0,
    sort_order: i,
  }));

  const rebuttals: Row[] = data.rebuttals.map((r, i) => ({
    id: r.id,
    entry_id: r.entryId,
    opponent: r.opponent,
    stance: r.stance,
    text: r.text,
    counter_refs: r.counterRefs,
    status: r.status,
    counter: r.counter ? JSON.stringify(r.counter) : null,
    citations: JSON.stringify(r.citations),
    sort_order: i,
  }));

  const sources: Row[] = data.sources.map((s, i) => ({
    id: s.id,
    label: s.label,
    detail: s.detail,
    kind: s.kind,
    status: s.status,
    archive: s.archive,
    sort_order: i,
  }));

  const categories: Row[] = data.categories.map((c, i) => ({
    id: c.id,
    label: c.label,
    subs: JSON.stringify(c.subs),
    sort_order: i,
  }));

  const tagSet = new Set<string>();
  for (const e of data.entries) for (const t of e.tags) tagSet.add(t);
  const tags: Row[] = Array.from(tagSet).map((label) => ({ id: label, label }));

  const entryTags: Row[] = data.entries.flatMap((e) =>
    e.tags.map((t) => ({ entry_id: e.id, tag_id: t })),
  );

  return { entries, commentaries, rebuttals, sources, categories, tags, entryTags };
}

export function rowsToAdminData(snap: DbSnapshot): AdminData {
  const tagsByEntry = new Map<string, string[]>();
  for (const link of snap.entryTags) {
    const entryId = String(link.entry_id);
    const list = tagsByEntry.get(entryId) ?? [];
    list.push(String(link.tag_id));
    tagsByEntry.set(entryId, list);
  }

  const entries: AdminEntry[] = snap.entries.map((r) => ({
    id: String(r.id),
    kind: r.kind as AdminEntry["kind"],
    title: String(r.title),
    originalText: String(r.original_text),
    translation: String(r.translation),
    category: String(r.category),
    subCategory: String(r.sub_category),
    reference: String(r.reference),
    tags: tagsByEntry.get(String(r.id)) ?? [],
    sections: JSON.parse(String(r.sections)),
    map: JSON.parse(String(r.map)),
  }));

  const commentaries: AdminCommentary[] = snap.commentaries.map((r) => ({
    id: String(r.id),
    entryId: String(r.entry_id),
    scholar: String(r.scholar),
    text: String(r.text),
    book: String(r.book),
    volumePage: String(r.volume_page),
    sourceRef: String(r.source_ref),
    status: r.status as AdminCommentary["status"],
    seeded: Boolean(r.seeded),
  }));

  const rebuttals: AdminRebuttal[] = snap.rebuttals.map((r) => ({
    id: String(r.id),
    entryId: String(r.entry_id),
    opponent: String(r.opponent),
    stance: String(r.stance),
    text: String(r.text),
    counterRefs: String(r.counter_refs),
    status: r.status as AdminRebuttal["status"],
    counter: r.counter == null ? undefined : (JSON.parse(String(r.counter)) as NonNullable<AdminRebuttal["counter"]>),
    citations: JSON.parse(String(r.citations)),
  }));

  const sources: AdminSource[] = snap.sources.map((r) => ({
    id: String(r.id),
    label: String(r.label),
    detail: String(r.detail),
    kind: r.kind as AdminSource["kind"],
    status: r.status as AdminSource["status"],
    archive: String(r.archive),
  }));

  const categories: AdminCategory[] = snap.categories.map((r) => ({
    id: String(r.id),
    label: String(r.label),
    subs: JSON.parse(String(r.subs)),
  }));

  const tags = snap.tags.map((r) => String(r.label));

  return { entries, commentaries, rebuttals, sources, categories, tags };
}

export function seedRows(): DbSnapshot {
  return adminDataToRows(seedData());
}
```

Add the seedData import at the top of `rows.ts` (before the other imports):

```ts
import { seedData } from "@/lib/admin-store";
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx vitest run src/server/__tests__/rows.test.ts
```

Expected: PASS (5 tests).

- [ ] **Step 5: Lint and commit**

```bash
npx eslint src/server/rows.ts src/server/__tests__/rows.test.ts
git add src/server/rows.ts src/server/__tests__/rows.test.ts
git commit -m "feat: add AdminData to relational row mapping"
```

---

### Task 6: `src/server/corpus-core.ts` — data access + seed + mutations

**Files:**
- Create: `src/server/corpus-core.ts`
- Test: `src/server/__tests__/corpus-core.integration.test.ts`

**Interfaces:**
- Consumes: `getDb` (Task 4), `adminDataToRows`/`rowsToAdminData`/`seedRows` (Task 5).
- Produces (all `async`, all return `Promise<AdminData>`):
  - `getCorpusData()`
  - `upsertEntry(entry: AdminEntry)`, `deleteEntry(id: string)`
  - `upsertCommentary(c: AdminCommentary)`, `deleteCommentary(id: string)`
  - `upsertRebuttal(r: AdminRebuttal)`, `deleteRebuttal(id: string)`
  - `upsertSource(s: AdminSource)`, `deleteSource(id: string)`
  - `upsertCategory(c: AdminCategory)`, `deleteCategory(id: string)`, `renameCategory(id: string, label: string)`, `addSubCategory(id: string, sub: string)`, `removeSubCategory(id: string, sub: string)`
  - `upsertTag(t: { id: string; label: string })`, `deleteTag(label: string)`
  - `resetCorpusData()`

- [ ] **Step 1: Write the failing integration test**

`src/server/__tests__/corpus-core.integration.test.ts` (gated behind `RUN_TURSO_INTEGRATION=1`; never runs in plain `npm test`):

```ts
import { describe, expect, it } from "vitest";
import { deleteEntry, getCorpusData, resetCorpusData, upsertEntry } from "@/server/corpus-core";
import { seedData } from "@/lib/admin-store";

const enabled = process.env.RUN_TURSO_INTEGRATION === "1";

describe.skipIf(!enabled)("corpus-core integration", () => {
  it("seeds and reads the corpus", async () => {
    await resetCorpusData();
    const data = await getCorpusData();
    expect(data.entries.length).toBe(seedData().entries.length);
    expect(data.tags.length).toBeGreaterThan(0);
  });

  it("persists an upserted entry", async () => {
    await resetCorpusData();
    const before = await getCorpusData();
    const entry = { ...before.entries[0]!, title: "Renamed by integration test" };
    await upsertEntry(entry);
    const after = await getCorpusData();
    expect(after.entries.find((e) => e.id === entry.id)?.title).toBe("Renamed by integration test");
  });

  it("deletes an entry and cascades children", async () => {
    await resetCorpusData();
    const before = await getCorpusData();
    const id = before.entries[0]!.id;
    await deleteEntry(id);
    const after = await getCorpusData();
    expect(after.entries.find((e) => e.id === id)).toBeUndefined();
    expect(after.commentaries.some((c) => c.entryId === id)).toBe(false);
    expect(after.rebuttals.some((r) => r.entryId === id)).toBe(false);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

```bash
$env:RUN_TURSO_INTEGRATION = "1"; npx vitest run src/server/__tests__/corpus-core.integration.test.ts
```

Expected: FAIL — `Cannot find module '@/server/corpus-core'`.

- [ ] **Step 3: Implement `src/server/corpus-core.ts`**

```ts
import type {
  AdminCategory,
  AdminCommentary,
  AdminData,
  AdminEntry,
  AdminRebuttal,
  AdminSource,
} from "@/lib/admin-store";
import { getDb } from "./db";
import { adminDataToRows, rowsToAdminData, seedRows } from "./rows";

type Exec = (sql: string) => Promise<{ rows: Record<string, unknown>[] }>;

const readAll = async (): Promise<AdminData> => {
  const db = await getDb();
  const [entries, commentaries, rebuttals, sources, categories, tags, entryTags] =
    await Promise.all([
      db.execute("SELECT * FROM entries ORDER BY sort_order"),
      db.execute("SELECT * FROM commentaries ORDER BY sort_order"),
      db.execute("SELECT * FROM rebuttals ORDER BY sort_order"),
      db.execute("SELECT * FROM sources ORDER BY sort_order"),
      db.execute("SELECT * FROM categories ORDER BY sort_order"),
      db.execute("SELECT * FROM tags ORDER BY label"),
      db.execute("SELECT * FROM entry_tags"),
    ]);
  return rowsToAdminData({
    entries: entries.rows as Record<string, unknown>[],
    commentaries: commentaries.rows as Record<string, unknown>[],
    rebuttals: rebuttals.rows as Record<string, unknown>[],
    sources: sources.rows as Record<string, unknown>[],
    categories: categories.rows as Record<string, unknown>[],
    tags: tags.rows as Record<string, unknown>[],
    entryTags: entryTags.rows as Record<string, unknown>[],
  });
};

const seedIfEmpty = async (): Promise<void> => {
  const db = await getDb();
  const res = await db.execute("SELECT COUNT(*) AS n FROM entries");
  const n = Number(res.rows[0]?.n ?? 0);
  if (n > 0) return;
  const rows = seedRows();
  const insert = (table: string, row: Record<string, unknown>) => {
    const cols = Object.keys(row);
    return {
      sql: `INSERT OR REPLACE INTO ${table} (${cols.join(", ")}) VALUES (${cols.map(() => "?").join(", ")})`,
      args: cols.map((c) => row[c]),
    };
  };
  const stmts = [
    ...rows.entries.map((r) => insert("entries", r)),
    ...rows.commentaries.map((r) => insert("commentaries", r)),
    ...rows.rebuttals.map((r) => insert("rebuttals", r)),
    ...rows.sources.map((r) => insert("sources", r)),
    ...rows.categories.map((r) => insert("categories", r)),
    ...rows.tags.map((r) => insert("tags", r)),
    ...rows.entryTags.map((r) => insert("entry_tags", r)),
  ];
  await db.batch(stmts, "write");
};

export async function getCorpusData(): Promise<AdminData> {
  await seedIfEmpty();
  return readAll();
}

// Preserves sort_order on update; appends at the end on insert.
const upsertWithOrder = async (
  table: string,
  pk: string,
  idValue: string,
  row: Record<string, unknown>,
): Promise<void> => {
  const db = await getDb();
  const existing = await db.execute({
    sql: `SELECT sort_order FROM ${table} WHERE ${pk} = ?`,
    args: [idValue],
  });
  const maxRes = await db.execute(`SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM ${table}`);
  const sortOrder =
    existing.rows.length > 0
      ? Number(existing.rows[0]!.sort_order)
      : Number(maxRes.rows[0]?.next ?? 0);
  const { sort_order: _dropped, ...rest } = row;
  const cols = Object.keys(rest);
  await db.execute({
    sql: `INSERT OR REPLACE INTO ${table} (${cols.join(", ")}, sort_order) VALUES (${cols.map(() => "?").join(", ")}, ?)`,
    args: [...cols.map((c) => rest[c]), sortOrder],
  });
};

const remove = async (sql: string, args: unknown[] = []): Promise<void> => {
  const db = await getDb();
  await db.execute({ sql, args });
};

export const resetCorpusData = async (): Promise<AdminData> => {
  const db = await getDb();
  const clear = [
    "DELETE FROM entry_tags",
    "DELETE FROM entries",
    "DELETE FROM commentaries",
    "DELETE FROM rebuttals",
    "DELETE FROM sources",
    "DELETE FROM categories",
    "DELETE FROM tags",
  ];
  await db.batch(clear.map((sql) => ({ sql })), "write");
  const rows = seedRows();
  const insert = (table: string, row: Record<string, unknown>) => {
    const cols = Object.keys(row);
    return {
      sql: `INSERT OR REPLACE INTO ${table} (${cols.join(", ")}) VALUES (${cols.map(() => "?").join(", ")})`,
      args: cols.map((c) => row[c]),
    };
  };
  await db.batch(
    [
      ...rows.entries.map((r) => insert("entries", r)),
      ...rows.commentaries.map((r) => insert("commentaries", r)),
      ...rows.rebuttals.map((r) => insert("rebuttals", r)),
      ...rows.sources.map((r) => insert("sources", r)),
      ...rows.categories.map((r) => insert("categories", r)),
      ...rows.tags.map((r) => insert("tags", r)),
      ...rows.entryTags.map((r) => insert("entry_tags", r)),
    ],
    "write",
  );
  return readAll();
};

export const upsertEntry = async (entry: AdminEntry): Promise<AdminData> => {
  const db = await getDb();
  const existing = await db.execute({
    sql: "SELECT sort_order FROM entries WHERE id = ?",
    args: [entry.id],
  });
  const maxRes = await db.execute("SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM entries");
  const sortOrder =
    existing.rows.length > 0
      ? Number(existing.rows[0]!.sort_order)
      : Number(maxRes.rows[0]?.next ?? 0);
  const row = adminDataToRows({ entries: [entry], commentaries: [], rebuttals: [], sources: [], categories: [], tags: [] }).entries[0]!;
  const stmts: { sql: string; args: unknown[] }[] = [
    {
      sql: `INSERT OR REPLACE INTO entries (id, kind, title, original_text, translation, category, sub_category, reference, sections, map, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        row.id, row.kind, row.title, row.original_text, row.translation, row.category,
        row.sub_category, row.reference, row.sections, row.map, sortOrder,
      ],
    },
    { sql: "DELETE FROM entry_tags WHERE entry_id = ?", args: [entry.id] },
  ];
  for (const tag of entry.tags) {
    stmts.push({ sql: "INSERT OR IGNORE INTO tags (id, label) VALUES (?, ?)", args: [tag, tag] });
    stmts.push({ sql: "INSERT OR IGNORE INTO entry_tags (entry_id, tag_id) VALUES (?, ?)", args: [entry.id, tag] });
  }
  await db.batch(stmts, "write");
  return readAll();
};

export const deleteEntry = async (id: string): Promise<AdminData> => {
  await remove("DELETE FROM entries WHERE id = ?", [id]);
  return readAll();
};

export const upsertCommentary = async (c: AdminCommentary): Promise<AdminData> => {
  await upsertWithOrder("commentaries", "id", c.id, {
    id: c.id, entry_id: c.entryId, scholar: c.scholar, text: c.text, book: c.book,
    volume_page: c.volumePage, source_ref: c.sourceRef, status: c.status,
    seeded: c.seeded ? 1 : 0,
  });
  return readAll();
};

export const deleteCommentary = async (id: string): Promise<AdminData> => {
  await remove("DELETE FROM commentaries WHERE id = ?", [id]);
  return readAll();
};

export const upsertRebuttal = async (r: AdminRebuttal): Promise<AdminData> => {
  await upsertWithOrder("rebuttals", "id", r.id, {
    id: r.id, entry_id: r.entryId, opponent: r.opponent, stance: r.stance, text: r.text,
    counter_refs: r.counterRefs, status: r.status,
    counter: r.counter ? JSON.stringify(r.counter) : null,
    citations: JSON.stringify(r.citations),
  });
  return readAll();
};

export const deleteRebuttal = async (id: string): Promise<AdminData> => {
  await remove("DELETE FROM rebuttals WHERE id = ?", [id]);
  return readAll();
};

export const upsertSource = async (s: AdminSource): Promise<AdminData> => {
  await upsertWithOrder("sources", "id", s.id, {
    id: s.id, label: s.label, detail: s.detail, kind: s.kind, status: s.status,
    archive: s.archive,
  });
  return readAll();
};

export const deleteSource = async (id: string): Promise<AdminData> => {
  await remove("DELETE FROM sources WHERE id = ?", [id]);
  return readAll();
};

export const upsertCategory = async (c: AdminCategory): Promise<AdminData> => {
  await upsertWithOrder("categories", "id", c.id, {
    id: c.id, label: c.label, subs: JSON.stringify(c.subs),
  });
  return readAll();
};

export const deleteCategory = async (id: string): Promise<AdminData> => {
  const db = await getDb();
  const res = await db.execute({ sql: "SELECT label FROM categories WHERE id = ?", args: [id] });
  const label = res.rows[0]?.label;
  const stmts: { sql: string; args: unknown[] }[] = [
    { sql: "DELETE FROM categories WHERE id = ?", args: [id] },
  ];
  if (typeof label === "string") {
    stmts.push({ sql: "UPDATE entries SET category = '' WHERE category = ?", args: [label] });
  }
  await db.batch(stmts, "write");
  return readAll();
};

export const renameCategory = async (id: string, label: string): Promise<AdminData> => {
  const db = await getDb();
  const res = await db.execute({ sql: "SELECT label FROM categories WHERE id = ?", args: [id] });
  const old = res.rows[0]?.label;
  const stmts: { sql: string; args: unknown[] }[] = [
    { sql: "UPDATE categories SET label = ? WHERE id = ?", args: [label, id] },
  ];
  if (typeof old === "string") {
    stmts.push({ sql: "UPDATE entries SET category = ? WHERE category = ?", args: [label, old] });
  }
  await db.batch(stmts, "write");
  return readAll();
};

export const addSubCategory = async (id: string, sub: string): Promise<AdminData> => {
  const db = await getDb();
  const res = await db.execute({ sql: "SELECT subs FROM categories WHERE id = ?", args: [id] });
  const subs = res.rows[0]?.subs ? (JSON.parse(String(res.rows[0]!.subs)) as string[]) : [];
  await db.execute({ sql: "UPDATE categories SET subs = ? WHERE id = ?", args: [JSON.stringify([...subs, sub]), id] });
  return readAll();
};

export const removeSubCategory = async (id: string, sub: string): Promise<AdminData> => {
  const db = await getDb();
  const res = await db.execute({ sql: "SELECT subs FROM categories WHERE id = ?", args: [id] });
  const subs = res.rows[0]?.subs ? (JSON.parse(String(res.rows[0]!.subs)) as string[]) : [];
  const cat = await db.execute({ sql: "SELECT label FROM categories WHERE id = ?", args: [id] });
  const label = cat.rows[0]?.label;
  const stmts: { sql: string; args: unknown[] }[] = [
    { sql: "UPDATE categories SET subs = ? WHERE id = ?", args: [JSON.stringify(subs.filter((x) => x !== sub)), id] },
  ];
  if (typeof label === "string") {
    stmts.push({
      sql: "UPDATE entries SET sub_category = '' WHERE category = ? AND sub_category = ?",
      args: [label, sub],
    });
  }
  await db.batch(stmts, "write");
  return readAll();
};

export const upsertTag = async (t: { id: string; label: string }): Promise<AdminData> => {
  await remove("INSERT OR IGNORE INTO tags (id, label) VALUES (?, ?)", [t.id, t.label]);
  return readAll();
};

export const deleteTag = async (label: string): Promise<AdminData> => {
  await remove("DELETE FROM tags WHERE label = ?", [label]);
  return readAll();
};
```

- [ ] **Step 4: Run the integration test to verify it passes**

```bash
$env:RUN_TURSO_INTEGRATION = "1"; npx vitest run src/server/__tests__/corpus-core.integration.test.ts
```

Expected: PASS (3 tests). If a test errors with "Turso credentials not found", confirm `.dev.vars` exists (Task 1) and that vitest runs with `process.cwd()` at the repo root (it does). Note: this test wipes and re-seeds the real DB — it is safe because the DB is in seed state.

- [ ] **Step 5: Lint and commit**

```bash
npx eslint src/server/corpus-core.ts src/server/__tests__/corpus-core.integration.test.ts
git add src/server/corpus-core.ts src/server/__tests__/corpus-core.integration.test.ts
git commit -m "feat: add Turso corpus data access and mutations"
```

---

### Task 7: Wire Cloudflare env capture into `src/server.ts`

**Files:**
- Modify: `src/server.ts`

**Interfaces:**
- Consumes: `setCloudflareEnv` (Task 2).
- Produces: in production, `getStashedCloudflareEnv()` returns the Worker bindings so `getDb()` (Task 4) finds credentials.

- [ ] **Step 1: Edit `src/server.ts`**

Add the import and capture the `env` binding at the top of the `fetch` handler:

```ts
import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { setCloudflareEnv } from "./server/env";
```

Then in the exported `fetch`, set the env before delegating:

```ts
export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    setCloudflareEnv(env);
    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
```

- [ ] **Step 2: Lint and commit**

```bash
npx eslint src/server.ts
git add src/server.ts
git commit -m "feat: expose Cloudflare env bindings to server modules"
```

---

### Task 8: `src/lib/corpus-api.ts` — TanStack Start server functions

**Files:**
- Create: `src/lib/corpus-api.ts`

**Interfaces:**
- Consumes: all of `src/server/corpus-core` (Task 6).
- Produces (createServerFn wrappers, each `method: "POST"`):
  - `getCorpus: () => Promise<AdminData>`
  - `upsertEntry(entry: AdminEntry)`, `deleteEntry(id: string)`
  - `upsertCommentary(c: AdminCommentary)`, `deleteCommentary(id: string)`
  - `upsertRebuttal(r: AdminRebuttal)`, `deleteRebuttal(id: string)`
  - `upsertSource(s: AdminSource)`, `deleteSource(id: string)`
  - `upsertCategory(c: AdminCategory)`, `deleteCategory(id: string)`, `renameCategory(id: string, label: string)`, `addSubCategory(id: string, sub: string)`, `removeSubCategory(id: string, sub: string)`
  - `upsertTag(t: { id: string; label: string })`, `deleteTag(label: string)`
  - `resetCorpus()`

- [ ] **Step 1: Implement `src/lib/corpus-api.ts`**

```ts
import { createServerFn } from "@tanstack/react-start";
import type {
  AdminCategory,
  AdminCommentary,
  AdminEntry,
  AdminRebuttal,
  AdminSource,
} from "@/lib/admin-store";
import * as core from "@/server/corpus-core";

export const getCorpus = createServerFn({ method: "POST" }).handler(core.getCorpusData);

export const upsertEntry = createServerFn({ method: "POST" })
  .validator((entry: AdminEntry) => entry)
  .handler(({ data }) => core.upsertEntry(data));

export const deleteEntry = createServerFn({ method: "POST" })
  .validator((id: string) => id)
  .handler(({ data }) => core.deleteEntry(data));

export const upsertCommentary = createServerFn({ method: "POST" })
  .validator((c: AdminCommentary) => c)
  .handler(({ data }) => core.upsertCommentary(data));

export const deleteCommentary = createServerFn({ method: "POST" })
  .validator((id: string) => id)
  .handler(({ data }) => core.deleteCommentary(data));

export const upsertRebuttal = createServerFn({ method: "POST" })
  .validator((r: AdminRebuttal) => r)
  .handler(({ data }) => core.upsertRebuttal(data));

export const deleteRebuttal = createServerFn({ method: "POST" })
  .validator((id: string) => id)
  .handler(({ data }) => core.deleteRebuttal(data));

export const upsertSource = createServerFn({ method: "POST" })
  .validator((s: AdminSource) => s)
  .handler(({ data }) => core.upsertSource(data));

export const deleteSource = createServerFn({ method: "POST" })
  .validator((id: string) => id)
  .handler(({ data }) => core.deleteSource(data));

export const upsertCategory = createServerFn({ method: "POST" })
  .validator((c: AdminCategory) => c)
  .handler(({ data }) => core.upsertCategory(data));

export const deleteCategory = createServerFn({ method: "POST" })
  .validator((id: string) => id)
  .handler(({ data }) => core.deleteCategory(data));

export const renameCategory = createServerFn({ method: "POST" })
  .validator((input: { id: string; label: string }) => input)
  .handler(({ data }) => core.renameCategory(data.id, data.label));

export const addSubCategory = createServerFn({ method: "POST" })
  .validator((input: { id: string; sub: string }) => input)
  .handler(({ data }) => core.addSubCategory(data.id, data.sub));

export const removeSubCategory = createServerFn({ method: "POST" })
  .validator((input: { id: string; sub: string }) => input)
  .handler(({ data }) => core.removeSubCategory(data.id, data.sub));

export const upsertTag = createServerFn({ method: "POST" })
  .validator((t: { id: string; label: string }) => t)
  .handler(({ data }) => core.upsertTag(data));

export const deleteTag = createServerFn({ method: "POST" })
  .validator((label: string) => label)
  .handler(({ data }) => core.deleteTag(data));

export const resetCorpus = createServerFn({ method: "POST" }).handler(core.resetCorpusData);
```

- [ ] **Step 2: Verify the client build strips server code**

Run the dev server and the production build; the import-protection plugin must NOT error on `@/server/corpus-core` from `src/lib/corpus-api.ts` (its usage is inside stripped server-fn handlers):

```bash
npm run build
```

Expected: build succeeds. **If it fails** with an import-protection violation for `@/server/corpus-core` or a libsql-in-browser error, switch the `import * as core from "@/server/corpus-core"` to dynamic imports inside each handler:

```ts
export const getCorpus = createServerFn({ method: "POST" }).handler(async () => {
  const core = await import("@/server/corpus-core");
  return core.getCorpusData();
});
```

and re-run the build.

- [ ] **Step 3: Lint and commit**

```bash
npx eslint src/lib/corpus-api.ts
git add src/lib/corpus-api.ts
git commit -m "feat: expose Turso corpus server functions"
```

---

### Task 9: Reading room reads from Turso

**Files:**
- Modify: `src/lib/use-corpus.ts`

**Interfaces:**
- Consumes: `getCorpus` (Task 8), `seedData` from `@/lib/admin-store`, `adminToEntries`/`collectionsFor` from `@/lib/corpus-adapter`.
- Produces: unchanged `useCorpus()` return shape `{ entries: Entry[]; collections: { id: string; label: string }[] }`.

- [ ] **Step 1: Replace `src/lib/use-corpus.ts`**

```ts
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { seedData } from "@/lib/admin-store";
import { getCorpus } from "@/lib/corpus-api";
import { adminToEntries, collectionsFor } from "@/lib/corpus-adapter";
import type { Entry } from "@/lib/corpus";

export function useCorpus(): {
  entries: Entry[];
  collections: { id: string; label: string }[];
} {
  const { data } = useQuery({
    queryKey: ["corpus"],
    queryFn: getCorpus,
    placeholderData: seedData,
  });

  return useMemo(() => {
    const entries = adminToEntries(data ?? seedData());
    return { entries, collections: collectionsFor(entries) };
  }, [data]);
}
```

`placeholderData: seedData` keeps SSR and the first client paint identical (seed corpus), then swaps to the server copy after hydration — avoiding a hydration mismatch by construction.

- [ ] **Step 2: Run the unit suite**

```bash
npm run test
```

Expected: existing 16 tests still pass (no regression).

- [ ] **Step 3: Dev-server smoke test**

```bash
$p = Start-Process -FilePath "npm.cmd" -ArgumentList "run","dev" -WorkingDirectory "C:\Users\sbere\OneDrive\Desktop\deb" -PassThru -WindowStyle Hidden
Start-Sleep -Seconds 25
(Invoke-WebRequest -Uri "http://localhost:8080/" -UseBasicParsing -TimeoutSec 30).Content -match "Reading room for verified debate"
taskkill /PID $p.Id /T /F
```

Expected: prints `True`. The home page must render without the error boundary (no "Something went wrong on our end").

- [ ] **Step 4: Lint and commit**

```bash
npx eslint src/lib/use-corpus.ts
git add src/lib/use-corpus.ts
git commit -m "feat: read corpus from Turso in the reading room"
```

---

### Task 10: Admin store type + layout switch to server data

**Files:**
- Modify: `src/lib/admin-store.ts`
- Modify: `src/routes/admin.tsx`

**Interfaces:**
- Consumes: `getCorpus`, `resetCorpus` (Task 8).
- Produces:
  - `AdminStore` changes from `{ data; update(fn); reset }` to `{ data: AdminData; mutate(run: () => Promise<AdminData>): Promise<void>; reset(): Promise<void> }`.
  - `useAdmin()` unchanged signature.

- [ ] **Step 1: Update `AdminStore` in `src/lib/admin-store.ts`**

Replace the `AdminStore` type:

```ts
export type AdminStore = {
  data: AdminData;
  mutate: (run: () => Promise<AdminData>) => Promise<void>;
  reset: () => Promise<void>;
};
```

The `update` field is gone. `AdminContext`, `useAdmin`, `seedData`, `uid`, `normalizeAdminData`, and all types stay as-is.

- [ ] **Step 2: Rewrite the data layer of `src/routes/admin.tsx`**

Add imports:

```ts
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getCorpus, resetCorpus } from "@/lib/corpus-api";
```

Remove the `useState<AdminData>(seedData)`, `hydrated`, and both `useEffect`s (localStorage load + persist). Replace with React Query hydration:

```tsx
function AdminLayout() {
  const { data } = useQuery({ queryKey: ["corpus"], queryFn: getCorpus });
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");

  const mutate = async (run: () => Promise<AdminData>) => {
    const next = await run();
    queryClient.setQueryData<AdminData>(["corpus"], next);
  };

  const store: AdminStore = useMemo(
    () => ({
      data: data ?? seedData(),
      mutate,
      reset: () => mutate(resetCorpus),
    }),
    [data, mutate],
  );
  // ... rest of the component unchanged
}
```

Imports to remove from `admin.tsx`: `useEffect`, `STORAGE_KEY`, `normalizeAdminData`, `AdminData` (still needed? only as the generic on setQueryData — keep the type import). `seedData` is still used for the loading fallback.

- [ ] **Step 3: Reset button uses `store.reset`**

The sidebar's "Reset to sample corpus" button already calls `store.reset()` — with the new store this now runs `resetCorpus` on the server. No change needed beyond Step 2.

- [ ] **Step 4: Lint, build, commit**

```bash
npx eslint src/lib/admin-store.ts src/routes/admin.tsx
npm run build
git add src/lib/admin-store.ts src/routes/admin.tsx
git commit -m "refactor: drive admin from Turso server data"
```

---

### Task 11: Entries page → server mutations

**Files:**
- Modify: `src/routes/admin.entries.tsx`

**Interfaces:**
- Consumes: `upsertEntry`, `deleteEntry`, `upsertTag` (Task 8); `mutate` from `useAdmin` (Task 10).

- [ ] **Step 1: Update the import and destructure**

Replace `import { uid, useAdmin, type AdminEntry } from "@/lib/admin-store";` with:

```ts
import { uid, useAdmin, type AdminEntry } from "@/lib/admin-store";
import { deleteEntry, upsertEntry, upsertTag } from "@/lib/corpus-api";
```

Replace `const { data, update } = useAdmin();` with `const { data, mutate } = useAdmin();`.

- [ ] **Step 2: Replace the three mutation sites**

`save()`:

```ts
const save = () => {
  if (!draft.title.trim()) return;
  mutate(() => upsertEntry(draft));
  setDraft(blank());
  setEditingId(null);
};
```

Delete button `onClick`:

```tsx
onClick={() => mutate(() => deleteEntry(e.id))}
```

`TagPicker` `onCreate`:

```tsx
onCreate={(tag) => mutate(() => upsertTag({ id: tag, label: tag }))}
```

- [ ] **Step 3: Lint, build, commit**

```bash
npx eslint src/routes/admin.entries.tsx
git add src/routes/admin.entries.tsx
git commit -m "refactor: entries admin page uses Turso mutations"
```

---

### Task 12: Commentaries page → server mutations

**Files:**
- Modify: `src/routes/admin.commentaries.tsx`

**Interfaces:**
- Consumes: `upsertCommentary`, `deleteCommentary` (Task 8); `mutate` from `useAdmin`.

- [ ] **Step 1: Update imports and destructure**

Add `import { deleteCommentary, upsertCommentary } from "@/lib/corpus-api";` and change `const { data, update } = useAdmin();` to `const { data, mutate } = useAdmin();`.

- [ ] **Step 2: Replace the mutation sites**

`save()`:

```ts
const save = () => {
  if (!draft.scholar.trim()) return;
  mutate(() => upsertCommentary({ ...draft, entryId }));
  setDraft(blank());
  setEditingId(null);
};
```

Delete button `onClick`:

```tsx
onClick={() => mutate(() => deleteCommentary(c.id))}
```

- [ ] **Step 3: Lint, build, commit**

```bash
npx eslint src/routes/admin.commentaries.tsx
git add src/routes/admin.commentaries.tsx
git commit -m "refactor: commentaries admin page uses Turso mutations"
```

---

### Task 13: Rebuttals page → server mutations

**Files:**
- Modify: `src/routes/admin.rebuttals.tsx`

**Interfaces:**
- Consumes: `upsertRebuttal`, `deleteRebuttal` (Task 8); `mutate` from `useAdmin`.

- [ ] **Step 1: Update imports and destructure**

Add `import { deleteRebuttal, upsertRebuttal } from "@/lib/corpus-api";` and change `const { data, update } = useAdmin();` to `const { data, mutate } = useAdmin();`.

- [ ] **Step 2: Replace the mutation sites**

`save()`:

```ts
const save = () => {
  if (!draft.opponent.trim() || !draft.text.trim()) return;
  mutate(() => upsertRebuttal({ ...draft, entryId }));
  setDraft(blank());
  setEditingId(null);
};
```

Delete button `onClick`:

```tsx
onClick={() => mutate(() => deleteRebuttal(r.id))}
```

- [ ] **Step 3: Lint, build, commit**

```bash
npx eslint src/routes/admin.rebuttals.tsx
git add src/routes/admin.rebuttals.tsx
git commit -m "refactor: rebuttals admin page uses Turso mutations"
```

---

### Task 14: Sources page → server mutations

**Files:**
- Modify: `src/routes/admin.sources.tsx`

**Interfaces:**
- Consumes: `upsertSource`, `deleteSource` (Task 8); `mutate` from `useAdmin`.

- [ ] **Step 1: Update imports and destructure**

Add `import { deleteSource, upsertSource } from "@/lib/corpus-api";` and change `const { data, update } = useAdmin();` to `const { data, mutate } = useAdmin();`.

- [ ] **Step 2: Replace the mutation sites**

`toggle()` (cycle verification status):

```ts
const toggle = (id: string) =>
  mutate(() => {
    const s = data.sources.find((x) => x.id === id);
    if (!s) return Promise.resolve(data);
    return upsertSource({ ...s, status: statusNext[s.status] });
  });
```

`save()`:

```ts
const save = () => {
  if (!draft.label.trim()) return;
  mutate(() => upsertSource(draft));
  setDraft(blank());
  setEditingId(null);
};
```

Delete button `onClick`:

```tsx
onClick={() => mutate(() => deleteSource(s.id))}
```

- [ ] **Step 3: Lint, build, commit**

```bash
npx eslint src/routes/admin.sources.tsx
git add src/routes/admin.sources.tsx
git commit -m "refactor: sources admin page uses Turso mutations"
```

---

### Task 15: Taxonomy page → server mutations

**Files:**
- Modify: `src/routes/admin.taxonomy.tsx`

**Interfaces:**
- Consumes: `upsertCategory`, `deleteCategory`, `renameCategory`, `addSubCategory`, `removeSubCategory`, `upsertTag`, `deleteTag` (Task 8); `mutate` from `useAdmin`.

- [ ] **Step 1: Update imports and destructure**

Add:

```ts
import {
  addSubCategory,
  deleteCategory,
  deleteTag,
  removeSubCategory,
  renameCategory,
  upsertCategory,
  upsertTag,
} from "@/lib/corpus-api";
```

Change `const { data, update } = useAdmin();` to `const { data, mutate } = useAdmin();`. The `uid` import is still used for category ids.

- [ ] **Step 2: Replace each handler**

`addCategory`:

```ts
const addCategory = () => {
  const label = newCat.trim();
  if (!label) return;
  mutate(() => upsertCategory({ id: uid("cat"), label, subs: [] }));
  setNewCat("");
};
```

`renameCategory`:

```ts
const renameCategory = (id: string) => {
  const label = renaming[id]?.trim();
  if (!label) return;
  mutate(() => renameCategory(id, label));
  setRenaming((r) => dropKey(id, r));
};
```

`removeCategory`:

```ts
const removeCategory = (id: string) => {
  mutate(() => deleteCategory(id));
};
```

`addSub`:

```ts
const addSub = (cat: AdminCategory) => {
  const sub = newSub[cat.id]?.trim();
  if (!sub) return;
  mutate(() => addSubCategory(cat.id, sub));
  setNewSub((s) => ({ ...s, [cat.id]: "" }));
};
```

`removeSub`:

```ts
const removeSub = (cat: AdminCategory, sub: string) => {
  mutate(() => removeSubCategory(cat.id, sub));
};
```

`addTag`:

```ts
const addTag = () => {
  const tag = newTag.trim();
  if (!tag) return;
  mutate(() => upsertTag({ id: tag, label: tag }));
  setNewTag("");
};
```

`removeTag`:

```ts
const removeTag = (tag: string) => {
  mutate(() => deleteTag(tag));
};
```

- [ ] **Step 3: Lint, build, commit**

```bash
npx eslint src/routes/admin.taxonomy.tsx
git add src/routes/admin.taxonomy.tsx
git commit -m "refactor: taxonomy admin page uses Turso mutations"
```

---

### Task 16: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Full unit suite + lint**

```bash
npm run test
npx eslint src/server src/lib/corpus-api.ts src/lib/use-corpus.ts src/routes/admin.tsx src/routes/admin.entries.tsx src/routes/admin.commentaries.tsx src/routes/admin.rebuttals.tsx src/routes/admin.sources.tsx src/routes/admin.taxonomy.tsx
```

Expected: all unit tests pass (16 existing + env + rows), lint clean on the touched files.

- [ ] **Step 2: Production build**

```bash
npm run build
```

Expected: client, SSR, and Nitro cloudflare-module builds succeed. The client bundle must not contain libsql or `src/server/*` code.

- [ ] **Step 3: Integration tests against the real DB**

```bash
$env:RUN_TURSO_INTEGRATION = "1"; npx vitest run src/server/__tests__/corpus-core.integration.test.ts
```

Expected: PASS (3 tests). Afterwards the DB is left in seed state.

- [ ] **Step 4: Manual end-to-end through the dev server**

1. Start `npm run dev`.
2. Visit `/` — the reading room renders from Turso (seed corpus).
3. Visit `/admin/entries`, rename the first entry, save, then reload the page — the change persists.
4. Visit `/` again — the renamed title shows in the reading room (server round-trip confirmed).
5. In admin, click "Reset to sample corpus" — the seed corpus returns.
6. Confirm the browser has no console errors and `localStorage` is no longer used (search the network tab for `_server_fn` calls).

- [ ] **Step 5: Final commit (if any files remain)**

```bash
git status
git add -A
git commit -m "chore: turso persistence cleanup"
```

## Self-Review Notes

- **Spec coverage:** schema (Task 3), server layer (Tasks 2/4/5/6/7), server functions (Task 8), admin refactor (Tasks 10–15), reading room (Task 9), env/setup (Task 1), testing (Tasks 2/5/6/16). The `resetCorpus` spec item maps to Task 8/10. The spec's "normalizeAdminData removed from load path" is satisfied: `use-corpus.ts` and `admin.tsx` no longer call it, while the function and its tests remain exported.
- **Placeholder scan:** every code step has concrete code; no "TBD"/"handle edge cases".
- **Type consistency:** `AdminStore.mutate(run: () => Promise<AdminData>)`, all `core.*` names match Task 6, all `corpus-api` names match Task 8, per-page server-fn names match their entity types.