import {
  seedData,
  type AdminCategory,
  type AdminCommentary,
  type AdminData,
  type AdminEntry,
  type AdminRebuttal,
  type AdminSource,
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
    translations: JSON.stringify(e.translations),
    related: JSON.stringify(e.related),
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
    warrant: r.warrant,
    backing: r.backing,
    qualifier: r.qualifier,
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
    const entryId = String(link["entry_id"]);
    const list = tagsByEntry.get(entryId) ?? [];
    list.push(String(link["tag_id"]));
    tagsByEntry.set(entryId, list);
  }

  const entries: AdminEntry[] = snap.entries.map((r) => ({
    id: String(r["id"]),
    kind: r["kind"] as AdminEntry["kind"],
    title: String(r["title"]),
    originalText: String(r["original_text"]),
    translation: String(r["translation"]),
    category: String(r["category"]),
    subCategory: String(r["sub_category"]),
    reference: String(r["reference"]),
    tags: tagsByEntry.get(String(r["id"])) ?? [],
    sections: JSON.parse(String(r["sections"])),
    map: JSON.parse(String(r["map"])),
    translations: JSON.parse(String(r["translations"] ?? "[]")),
    related: JSON.parse(String(r["related"] ?? "[]")),
  }));

  const commentaries: AdminCommentary[] = snap.commentaries.map((r) => ({
    id: String(r["id"]),
    entryId: String(r["entry_id"]),
    scholar: String(r["scholar"]),
    text: String(r["text"]),
    book: String(r["book"]),
    volumePage: String(r["volume_page"]),
    sourceRef: String(r["source_ref"]),
    status: r["status"] as AdminCommentary["status"],
    seeded: Boolean(r["seeded"]),
  }));

  const rebuttals: AdminRebuttal[] = snap.rebuttals.map((r) => ({
    id: String(r["id"]),
    entryId: String(r["entry_id"]),
    opponent: String(r["opponent"]),
    stance: String(r["stance"]),
    text: String(r["text"]),
    counterRefs: String(r["counter_refs"]),
    status: r["status"] as AdminRebuttal["status"],
    counter:
      r["counter"] == null
        ? undefined
        : (JSON.parse(String(r["counter"])) as NonNullable<AdminRebuttal["counter"]>),
    citations: JSON.parse(String(r["citations"])),
    warrant: String(r["warrant"] ?? ""),
    backing: String(r["backing"] ?? ""),
    qualifier: String(r["qualifier"] ?? ""),
  }));

  const sources: AdminSource[] = snap.sources.map((r) => ({
    id: String(r["id"]),
    label: String(r["label"]),
    detail: String(r["detail"]),
    kind: r["kind"] as AdminSource["kind"],
    status: r["status"] as AdminSource["status"],
    archive: String(r["archive"]),
  }));

  const categories: AdminCategory[] = snap.categories.map((r) => ({
    id: String(r["id"]),
    label: String(r["label"]),
    subs: JSON.parse(String(r["subs"])),
  }));

  const tags = snap.tags.map((r) => String(r["label"]));

  return { entries, commentaries, rebuttals, sources, categories, tags };
}

export function seedRows(): DbSnapshot {
  return adminDataToRows(seedData());
}
