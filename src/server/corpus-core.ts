import type {
  AdminCategory,
  AdminCommentary,
  AdminData,
  AdminEntry,
  AdminRebuttal,
  AdminSource,
} from "@/lib/admin-store";
import { uid } from "@/lib/admin-store";
import type { InStatement, InValue } from "@libsql/client/web";
import { getDb } from "./db";
import { markCitationsVerified } from "./citations";
import { adminDataToRows, rowsToAdminData, seedRows } from "./rows";

export type SourceRequest = {
  id: string;
  entryId: string;
  target: string;
  proposal: string;
  archive: string;
  note: string;
  status: "pending" | "approved" | "dismissed";
  createdAt: number;
};

export type SourceRequestInput = {
  entryId: string;
  target: string;
  proposal: string;
  archive: string;
  note: string;
};

export type ReadingPath = {
  id: string;
  title: string;
  description: string;
  entryIds: string[];
};

export type VoteTally = { up: number; down: number; mine: number };

const audit = async (
  db: Awaited<ReturnType<typeof getDb>>,
  action: string,
  entity: string,
  entityId: string,
  summary: string,
): Promise<void> => {
  await db.execute({
    sql: "INSERT INTO audit_log (id, at, actor, action, entity, entity_id, summary) VALUES (?, ?, ?, ?, ?, ?, ?)",
    args: [uid("aud"), Date.now(), "admin", action, entity, entityId, summary],
  });
};

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

const insertBatch = async (rows: ReturnType<typeof seedRows>): Promise<void> => {
  const db = await getDb();
  const insert = (table: string, row: Record<string, unknown>): InStatement => {
    const cols = Object.keys(row);
    return {
      sql: `INSERT OR REPLACE INTO ${table} (${cols.join(", ")}) VALUES (${cols.map(() => "?").join(", ")})`,
      args: cols.map((c) => row[c] as InValue),
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
};

const seedIfEmpty = async (): Promise<void> => {
  const db = await getDb();
  const res = await db.execute("SELECT COUNT(*) AS n FROM entries");
  const n = Number(res.rows[0]?.["n"] ?? 0);
  if (n > 0) return;
  await insertBatch(seedRows());
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
      ? Number(existing.rows[0]!["sort_order"])
      : Number(maxRes.rows[0]?.["next"] ?? 0);
  const { sort_order: _dropped, ...rest } = row;
  const cols = Object.keys(rest);
  await db.execute({
    sql: `INSERT OR REPLACE INTO ${table} (${cols.join(", ")}, sort_order) VALUES (${cols.map(() => "?").join(", ")}, ?)`,
    args: [...cols.map((c) => rest[c] as InValue), sortOrder],
  });
};

const remove = async (sql: string, args: InValue[] = []): Promise<void> => {
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
  await db.batch(
    clear.map((sql) => ({ sql })),
    "write",
  );
  await insertBatch(seedRows());
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
      ? Number(existing.rows[0]!["sort_order"])
      : Number(maxRes.rows[0]?.["next"] ?? 0);
  const row = adminDataToRows({
    entries: [entry],
    commentaries: [],
    rebuttals: [],
    sources: [],
    categories: [],
    tags: [],
  }).entries[0]!;
  const stmts: InStatement[] = [
    {
      sql: `INSERT OR REPLACE INTO entries (id, kind, title, original_text, translation, category, sub_category, reference, sections, map, translations, related, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        row["id"],
        row["kind"],
        row["title"],
        row["original_text"],
        row["translation"],
        row["category"],
        row["sub_category"],
        row["reference"],
        row["sections"],
        row["map"],
        row["translations"],
        row["related"],
        sortOrder,
      ] as InValue[],
    },
    { sql: "DELETE FROM entry_tags WHERE entry_id = ?", args: [entry.id] },
  ];
  for (const tag of entry.tags) {
    stmts.push({ sql: "INSERT OR IGNORE INTO tags (id, label) VALUES (?, ?)", args: [tag, tag] });
    stmts.push({
      sql: "INSERT OR IGNORE INTO entry_tags (entry_id, tag_id) VALUES (?, ?)",
      args: [entry.id, tag],
    });
  }
  await db.batch(stmts, "write");
  await audit(db, "upsert", "entry", entry.id, entry.title);
  return readAll();
};

export const deleteEntry = async (id: string): Promise<AdminData> => {
  await remove("DELETE FROM entries WHERE id = ?", [id]);
  const db = await getDb();
  await audit(db, "delete", "entry", id, id);
  return readAll();
};

export const upsertCommentary = async (c: AdminCommentary): Promise<AdminData> => {
  await upsertWithOrder("commentaries", "id", c.id, {
    id: c.id,
    entry_id: c.entryId,
    scholar: c.scholar,
    text: c.text,
    book: c.book,
    volume_page: c.volumePage,
    source_ref: c.sourceRef,
    status: c.status,
    seeded: c.seeded ? 1 : 0,
  });
  const db = await getDb();
  await audit(db, "upsert", "commentary", c.id, `${c.scholar}: ${c.text.slice(0, 60)}`);
  return readAll();
};

export const deleteCommentary = async (id: string): Promise<AdminData> => {
  await remove("DELETE FROM commentaries WHERE id = ?", [id]);
  const db = await getDb();
  await audit(db, "delete", "commentary", id, id);
  return readAll();
};

export const upsertRebuttal = async (r: AdminRebuttal): Promise<AdminData> => {
  const db = await getDb();
  await upsertWithOrder("rebuttals", "id", r.id, {
    id: r.id,
    entry_id: r.entryId,
    opponent: r.opponent,
    stance: r.stance,
    text: r.text,
    counter_refs: r.counterRefs,
    status: r.status,
    counter: r.counter ? JSON.stringify(r.counter) : null,
    citations: JSON.stringify(r.citations),
    warrant: r.warrant,
    backing: r.backing,
    qualifier: r.qualifier,
  });
  await audit(db, "upsert", "rebuttal", r.id, `${r.stance}: ${r.text.slice(0, 60)}`);
  return readAll();
};

export const deleteRebuttal = async (id: string): Promise<AdminData> => {
  await remove("DELETE FROM rebuttals WHERE id = ?", [id]);
  const db = await getDb();
  await audit(db, "delete", "rebuttal", id, id);
  return readAll();
};

export const upsertSource = async (s: AdminSource): Promise<AdminData> => {
  await upsertWithOrder("sources", "id", s.id, {
    id: s.id,
    label: s.label,
    detail: s.detail,
    kind: s.kind,
    status: s.status,
    archive: s.archive,
  });
  const db = await getDb();
  await audit(db, "upsert", "source", s.id, s.label);
  return readAll();
};

export const deleteSource = async (id: string): Promise<AdminData> => {
  await remove("DELETE FROM sources WHERE id = ?", [id]);
  const db = await getDb();
  await audit(db, "delete", "source", id, id);
  return readAll();
};

export const upsertCategory = async (c: AdminCategory): Promise<AdminData> => {
  await upsertWithOrder("categories", "id", c.id, {
    id: c.id,
    label: c.label,
    subs: JSON.stringify(c.subs),
  });
  const db = await getDb();
  await audit(db, "upsert", "category", c.id, c.label);
  return readAll();
};

export const deleteCategory = async (id: string): Promise<AdminData> => {
  const db = await getDb();
  const res = await db.execute({ sql: "SELECT label FROM categories WHERE id = ?", args: [id] });
  const label = res.rows[0]?.["label"];
  const stmts: InStatement[] = [{ sql: "DELETE FROM categories WHERE id = ?", args: [id] }];
  if (typeof label === "string") {
    stmts.push({ sql: "UPDATE entries SET category = '' WHERE category = ?", args: [label] });
  }
  await db.batch(stmts, "write");
  await audit(db, "delete", "category", id, typeof label === "string" ? label : id);
  return readAll();
};

export const renameCategory = async (id: string, label: string): Promise<AdminData> => {
  const db = await getDb();
  const res = await db.execute({ sql: "SELECT label FROM categories WHERE id = ?", args: [id] });
  const old = res.rows[0]?.["label"];
  const stmts: InStatement[] = [
    { sql: "UPDATE categories SET label = ? WHERE id = ?", args: [label, id] },
  ];
  if (typeof old === "string") {
    stmts.push({ sql: "UPDATE entries SET category = ? WHERE category = ?", args: [label, old] });
  }
  await db.batch(stmts, "write");
  await audit(db, "rename", "category", id, `${old ?? ""} -> ${label}`);
  return readAll();
};

export const addSubCategory = async (id: string, sub: string): Promise<AdminData> => {
  const db = await getDb();
  const res = await db.execute({ sql: "SELECT subs FROM categories WHERE id = ?", args: [id] });
  const subs = res.rows[0]?.["subs"] ? (JSON.parse(String(res.rows[0]!["subs"])) as string[]) : [];
  await db.execute({
    sql: "UPDATE categories SET subs = ? WHERE id = ?",
    args: [JSON.stringify([...subs, sub]), id],
  });
  const db2 = await getDb();
  await audit(db2, "add-subcategory", "category", id, sub);
  return readAll();
};

export const removeSubCategory = async (id: string, sub: string): Promise<AdminData> => {
  const db = await getDb();
  const res = await db.execute({ sql: "SELECT subs FROM categories WHERE id = ?", args: [id] });
  const subs = res.rows[0]?.["subs"] ? (JSON.parse(String(res.rows[0]!["subs"])) as string[]) : [];
  const cat = await db.execute({ sql: "SELECT label FROM categories WHERE id = ?", args: [id] });
  const label = cat.rows[0]?.["label"];
  const stmts: InStatement[] = [
    {
      sql: "UPDATE categories SET subs = ? WHERE id = ?",
      args: [JSON.stringify(subs.filter((x) => x !== sub)), id],
    },
  ];
  if (typeof label === "string") {
    stmts.push({
      sql: "UPDATE entries SET sub_category = '' WHERE category = ? AND sub_category = ?",
      args: [label, sub],
    });
  }
  await db.batch(stmts, "write");
  await audit(db, "remove-subcategory", "category", id, sub);
  return readAll();
};

export const upsertTag = async (t: { id: string; label: string }): Promise<AdminData> => {
  await remove("INSERT OR IGNORE INTO tags (id, label) VALUES (?, ?)", [t.id, t.label]);
  const db = await getDb();
  await audit(db, "upsert", "tag", t.id, t.label);
  return readAll();
};

export const deleteTag = async (label: string): Promise<AdminData> => {
  await remove("DELETE FROM tags WHERE label = ?", [label]);
  const db = await getDb();
  await audit(db, "delete", "tag", label, label);
  return readAll();
};

// --- Source requests ---------------------------------------------------------

const requestFromRow = (r: Record<string, unknown>): SourceRequest => ({
  id: String(r["id"]),
  entryId: String(r["entry_id"]),
  target: String(r["target"]),
  proposal: String(r["proposal"]),
  archive: String(r["archive"]),
  note: String(r["note"]),
  status: r["status"] as SourceRequest["status"],
  createdAt: Number(r["created_at"]),
});

export async function listSourceRequests(
  status: "pending" | "approved" | "dismissed" | "all" = "all",
): Promise<SourceRequest[]> {
  const db = await getDb();
  const where = status === "all" ? "" : "WHERE status = ?";
  const args = status === "all" ? [] : [status];
  const res = await db.execute({
    sql: `SELECT * FROM source_requests ${where} ORDER BY created_at DESC`,
    args,
  });
  return (res.rows as Record<string, unknown>[]).map(requestFromRow);
}

export async function createSourceRequest(input: SourceRequestInput): Promise<SourceRequest[]> {
  if (!input.proposal.trim()) return listSourceRequests();
  const db = await getDb();
  const id = uid("req");
  await db.execute({
    sql: "INSERT INTO source_requests (id, entry_id, target, proposal, archive, note, status, created_at) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)",
    args: [id, input.entryId, input.target, input.proposal, input.archive, input.note, Date.now()],
  });
  await audit(db, "create", "source-request", id, input.target);
  return listSourceRequests();
}

export async function approveSourceRequest(id: string): Promise<AdminData> {
  const db = await getDb();
  const res = await db.execute({
    sql: "SELECT * FROM source_requests WHERE id = ?",
    args: [id],
  });
  const row = res.rows[0] as Record<string, unknown> | undefined;
  if (!row) return readAll();
  const proposal = String(row["proposal"]);
  const archive = String(row["archive"]);
  const label = proposal.split(/[,.(]/)[0]?.trim().slice(0, 60) || "Submitted source";

  await db.batch(
    [
      {
        sql: "UPDATE source_requests SET status = 'approved' WHERE id = ?",
        args: [id],
      },
      {
        sql: "INSERT OR REPLACE INTO sources (id, label, detail, kind, status, archive, sort_order) VALUES (?, ?, ?, 'book', 'verified', ?, COALESCE((SELECT MAX(sort_order) FROM sources), -1) + 1)",
        args: [uid("src"), label, proposal, archive],
      },
    ],
    "write",
  );

  const data = await readAll();
  const { entries: changedEntries, rebuttals: changedRebuttals } = markCitationsVerified(
    data,
    proposal,
  );
  for (const entry of changedEntries.values()) {
    await db.execute({
      sql: "UPDATE entries SET sections = ?, map = ?, translations = ?, related = ? WHERE id = ?",
      args: [
        JSON.stringify(entry.sections),
        JSON.stringify(entry.map),
        JSON.stringify(entry.translations),
        JSON.stringify(entry.related),
        entry.id,
      ],
    });
  }
  for (const rebuttal of changedRebuttals.values()) {
    await db.execute({
      sql: "UPDATE rebuttals SET citations = ?, warrant = ?, backing = ?, qualifier = ? WHERE id = ?",
      args: [
        JSON.stringify(rebuttal.citations),
        rebuttal.warrant,
        rebuttal.backing,
        rebuttal.qualifier,
        rebuttal.id,
      ],
    });
  }
  await audit(db, "approve", "source-request", id, proposal);
  return readAll();
}

export async function dismissSourceRequest(id: string): Promise<SourceRequest[]> {
  const db = await getDb();
  await db.execute({
    sql: "UPDATE source_requests SET status = 'dismissed' WHERE id = ?",
    args: [id],
  });
  await audit(db, "dismiss", "source-request", id, id);
  return listSourceRequests();
}

// --- Voting ------------------------------------------------------------------

export async function castVote(
  targetType: string,
  targetId: string,
  clientId: string,
  direction: -1 | 0 | 1,
): Promise<VoteTally> {
  const db = await getDb();
  await db.execute({
    sql: "INSERT INTO votes (id, target_type, target_id, client_id, direction, created_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(target_type, target_id, client_id) DO UPDATE SET direction = excluded.direction",
    args: [uid("vote"), targetType, targetId, clientId, direction, Date.now()],
  });
  return getVoteTally(targetType, targetId, clientId);
}

export async function getVoteTally(
  targetType: string,
  targetId: string,
  clientId = "",
): Promise<VoteTally> {
  const db = await getDb();
  const res = await db.execute({
    sql: "SELECT COALESCE(SUM(direction = 1), 0) AS up, COALESCE(SUM(direction = -1), 0) AS down FROM votes WHERE target_type = ? AND target_id = ?",
    args: [targetType, targetId],
  });
  const up = Number(res.rows[0]?.["up"] ?? 0);
  const down = Number(res.rows[0]?.["down"] ?? 0);
  let mine = 0;
  if (clientId) {
    const mineRes = await db.execute({
      sql: "SELECT direction FROM votes WHERE target_type = ? AND target_id = ? AND client_id = ?",
      args: [targetType, targetId, clientId],
    });
    mine = Number(mineRes.rows[0]?.["direction"] ?? 0);
  }
  return { up, down, mine };
}

export async function getVotesFor(
  targetType: string,
  targetIds: string[],
  clientId = "",
): Promise<Record<string, VoteTally>> {
  const out: Record<string, VoteTally> = {};
  for (const id of targetIds) out[id] = await getVoteTally(targetType, id, clientId);
  return out;
}

// --- Guided paths ------------------------------------------------------------

const pathFromRow = (r: Record<string, unknown>): ReadingPath => ({
  id: String(r["id"]),
  title: String(r["title"]),
  description: String(r["description"]),
  entryIds: JSON.parse(String(r["entry_ids"] ?? "[]")) as string[],
});

export async function listPaths(): Promise<ReadingPath[]> {
  const db = await getDb();
  const res = await db.execute("SELECT * FROM paths ORDER BY sort_order, title");
  return (res.rows as Record<string, unknown>[]).map(pathFromRow);
}

export async function upsertPath(p: ReadingPath): Promise<ReadingPath[]> {
  const db = await getDb();
  const existing = await db.execute({
    sql: "SELECT sort_order FROM paths WHERE id = ?",
    args: [p.id],
  });
  const sortOrder =
    existing.rows.length > 0
      ? Number(existing.rows[0]!["sort_order"])
      : Number(
          (await db.execute("SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM paths"))
            .rows[0]?.["next"] ?? 0,
        );
  await db.execute({
    sql: "INSERT OR REPLACE INTO paths (id, title, description, entry_ids, sort_order) VALUES (?, ?, ?, ?, ?)",
    args: [p.id, p.title, p.description, JSON.stringify(p.entryIds), sortOrder],
  });
  await audit(db, "upsert", "path", p.id, p.title);
  return listPaths();
}

export async function deletePath(id: string): Promise<ReadingPath[]> {
  const db = await getDb();
  await db.execute({ sql: "DELETE FROM paths WHERE id = ?", args: [id] });
  await audit(db, "delete", "path", id, id);
  return listPaths();
}

// --- Audit log ---------------------------------------------------------------

export type AuditEntry = {
  id: string;
  at: number;
  actor: string;
  action: string;
  entity: string;
  entityId: string;
  summary: string;
};

export async function getAuditLog(limit = 200): Promise<AuditEntry[]> {
  const db = await getDb();
  const res = await db.execute({
    sql: "SELECT * FROM audit_log ORDER BY at DESC LIMIT ?",
    args: [limit],
  });
  return (res.rows as Record<string, unknown>[]).map((r) => ({
    id: String(r["id"]),
    at: Number(r["at"]),
    actor: String(r["actor"]),
    action: String(r["action"]),
    entity: String(r["entity"]),
    entityId: String(r["entity_id"]),
    summary: String(r["summary"]),
  }));
}

// --- AI-assisted verification (pluggable; disabled without AI_VERIFY_URL/KEY) -

export async function aiSuggestSource(
  detail: string,
): Promise<{ available: boolean; suggestion?: string }> {
  const url = process.env["AI_VERIFY_URL"];
  const key = process.env["AI_VERIFY_KEY"];
  if (!url || !key || !detail.trim()) return { available: false };
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        detail,
        instruction:
          "Given this citation detail, return a suggested archive or shelfmark for verification, or empty string if unknown. Reply with plain text only.",
      }),
    });
    if (!res.ok) return { available: false };
    const text = (await res.text()).trim();
    if (!text) return { available: true };
    return { available: true, suggestion: text };
  } catch {
    return { available: false };
  }
}
