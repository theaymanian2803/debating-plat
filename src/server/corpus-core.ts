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
};

const seedIfEmpty = async (): Promise<void> => {
  const db = await getDb();
  const res = await db.execute("SELECT COUNT(*) AS n FROM entries");
  const n = Number(res.rows[0]?.n ?? 0);
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
      ? Number(existing.rows[0]!.sort_order)
      : Number(maxRes.rows[0]?.next ?? 0);
  const row = adminDataToRows({
    entries: [entry],
    commentaries: [],
    rebuttals: [],
    sources: [],
    categories: [],
    tags: [],
  }).entries[0]!;
  const stmts: { sql: string; args: unknown[] }[] = [
    {
      sql: `INSERT OR REPLACE INTO entries (id, kind, title, original_text, translation, category, sub_category, reference, sections, map, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        row.id,
        row.kind,
        row.title,
        row.original_text,
        row.translation,
        row.category,
        row.sub_category,
        row.reference,
        row.sections,
        row.map,
        sortOrder,
      ],
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
  return readAll();
};

export const deleteEntry = async (id: string): Promise<AdminData> => {
  await remove("DELETE FROM entries WHERE id = ?", [id]);
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
  return readAll();
};

export const deleteCommentary = async (id: string): Promise<AdminData> => {
  await remove("DELETE FROM commentaries WHERE id = ?", [id]);
  return readAll();
};

export const upsertRebuttal = async (r: AdminRebuttal): Promise<AdminData> => {
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
  });
  return readAll();
};

export const deleteRebuttal = async (id: string): Promise<AdminData> => {
  await remove("DELETE FROM rebuttals WHERE id = ?", [id]);
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
  return readAll();
};

export const deleteSource = async (id: string): Promise<AdminData> => {
  await remove("DELETE FROM sources WHERE id = ?", [id]);
  return readAll();
};

export const upsertCategory = async (c: AdminCategory): Promise<AdminData> => {
  await upsertWithOrder("categories", "id", c.id, {
    id: c.id,
    label: c.label,
    subs: JSON.stringify(c.subs),
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
  await db.execute({
    sql: "UPDATE categories SET subs = ? WHERE id = ?",
    args: [JSON.stringify([...subs, sub]), id],
  });
  return readAll();
};

export const removeSubCategory = async (id: string, sub: string): Promise<AdminData> => {
  const db = await getDb();
  const res = await db.execute({ sql: "SELECT subs FROM categories WHERE id = ?", args: [id] });
  const subs = res.rows[0]?.subs ? (JSON.parse(String(res.rows[0]!.subs)) as string[]) : [];
  const cat = await db.execute({ sql: "SELECT label FROM categories WHERE id = ?", args: [id] });
  const label = cat.rows[0]?.label;
  const stmts: { sql: string; args: unknown[] }[] = [
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
