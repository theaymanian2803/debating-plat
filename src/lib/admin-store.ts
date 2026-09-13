import { createContext, useContext } from "react";
import {
  entries as corpusEntries,
  type Citation,
  type CommentarySection,
  type Entry,
  type Rebuttal,
  type Verification,
} from "@/lib/corpus";

export type AdminEntry = {
  id: string;
  kind: "verse" | "premise";
  title: string;
  originalText: string;
  translation: string;
  category: string;
  subCategory: string;
  reference: string;
  tags: string[];
  sections: CommentarySection[];
  map: Entry["map"];
};

export type AdminCommentary = {
  id: string;
  entryId: string;
  scholar: string;
  text: string;
  book: string;
  volumePage: string;
  sourceRef: string;
  status: Verification;
  seeded: boolean;
};

export type AdminRebuttal = {
  id: string;
  entryId: string;
  opponent: string;
  stance: string;
  text: string;
  counterRefs: string;
  status: Verification;
  counter?: Rebuttal["counter"];
  citations: Citation[];
};

export type SourceStatus = "verified" | "pending" | "unverified";

export type AdminSource = {
  id: string;
  label: string;
  detail: string;
  kind: "book" | "article" | "manuscript" | "scholar";
  status: SourceStatus;
  archive: string;
};

export type AdminCategory = { id: string; label: string; subs: string[] };

export type AdminData = {
  entries: AdminEntry[];
  commentaries: AdminCommentary[];
  rebuttals: AdminRebuttal[];
  sources: AdminSource[];
  categories: AdminCategory[];
  tags: string[];
};

export const uid = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 9)}`;

const categoryLabel: Record<string, string> = {
  religious: "Religion",
  philosophy: "Philosophy",
  ethics: "Ethics",
};

const statusToSource: Record<Verification, SourceStatus> = {
  verified: "verified",
  disputed: "pending",
  unverified: "unverified",
};

export function seedData(): AdminData {
  const entries: AdminEntry[] = corpusEntries.map((e) => {
    const parts = e.breadcrumb.split("/").map((p) => p.trim());
    return {
      id: e.id,
      kind: e.kind,
      title: e.title,
      originalText: e.primary,
      translation: e.secondary,
      category: categoryLabel[e.collection] ?? e.collection,
      subCategory: parts[parts.length - 1] ?? "",
      reference: e.subtitle,
      tags: e.map.nodes.slice(0, 3).map((n) => n.label),
      sections: e.sections,
      map: e.map,
    };
  });

  const commentaries: AdminCommentary[] = corpusEntries.flatMap((e) =>
    e.sections.flatMap((s) =>
      s.citations.map((c) => ({
        id: uid("com"),
        entryId: e.id,
        scholar: c.label.replace(/\s\d{4}.*$/, ""),
        text: s.body,
        book: c.detail,
        volumePage: c.detail.split(",").slice(-1)[0]?.trim() ?? "",
        sourceRef: c.archive,
        status: c.status,
        seeded: true,
      })),
    ),
  );

  const rebuttals: AdminRebuttal[] = corpusEntries.flatMap((e) =>
    e.rebuttals.map((r) => ({
      id: uid("reb"),
      entryId: e.id,
      opponent: r.counter?.author ?? r.perspective,
      stance: r.perspective,
      text: r.counter?.body ?? r.claim,
      counterRefs: r.citations.map((c) => c.label).join("; "),
      status: r.status,
      ...(r.counter ? { counter: r.counter } : {}),
      citations: r.citations,
    })),
  );

  const seen = new Set<string>();
  const sources: AdminSource[] = [];
  for (const e of corpusEntries) {
    for (const c of [
      ...e.sections.flatMap((s) => s.citations),
      ...e.rebuttals.flatMap((r) => r.citations),
    ]) {
      if (seen.has(c.label)) continue;
      seen.add(c.label);
      sources.push({
        id: uid("src"),
        label: c.label,
        detail: c.detail,
        kind: "book",
        status: statusToSource[c.status],
        archive: c.archive,
      });
    }
  }

  const tags = Array.from(new Set(entries.flatMap((e) => e.tags)));

  return {
    entries,
    commentaries,
    rebuttals,
    sources,
    categories: [
      { id: "religion", label: "Religion", subs: ["Torah", "Gospels", "Qur'an"] },
      { id: "philosophy", label: "Philosophy", subs: ["Ethics", "Metaphysics", "Logic"] },
      { id: "ethics", label: "Ethics", subs: ["Stoicism", "Virtue ethics"] },
    ],
    tags,
  };
}

export type AdminStore = {
  data: AdminData;
  mutate: (run: () => Promise<AdminData>) => Promise<void>;
  reset: () => Promise<void>;
};

// Data persisted under STORAGE_KEY predates the sections/map/citations/seeded
// fields (older admin forms saved entries and rebuttals without them). Fill in
// missing fields so both the reading room and the admin area can load any saved
// copy without crashing.
export function normalizeAdminData(data: AdminData): AdminData {
  const entries = data.entries.map((e) => ({
    ...e,
    sections: Array.isArray(e.sections) ? e.sections : [],
    map:
      e.map && Array.isArray(e.map.nodes) && Array.isArray(e.map.edges)
        ? e.map
        : { nodes: [], edges: [] },
  }));
  const commentaries = data.commentaries.map((c) => ({
    ...c,
    seeded: typeof c.seeded === "boolean" ? c.seeded : false,
  }));
  const rebuttals = data.rebuttals.map((r) => ({
    ...r,
    citations: Array.isArray(r.citations) ? r.citations : [],
    counter: r.counter,
  }));
  return {
    entries,
    commentaries,
    rebuttals,
    sources: Array.isArray(data.sources) ? data.sources : [],
    categories: Array.isArray(data.categories) ? data.categories : [],
    tags: Array.isArray(data.tags) ? data.tags : [],
  };
}

export const AdminContext = createContext<AdminStore | null>(null);

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used inside the admin layout");
  return ctx;
}

export const STORAGE_KEY = "scholia-admin-v1";
