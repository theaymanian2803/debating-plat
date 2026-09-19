import type { Entry } from "@/lib/corpus";
import type { AdminData } from "@/lib/admin-store";

const labelToCollectionId: Record<string, string> = {
  Religion: "religious",
  Philosophy: "philosophy",
  Ethics: "ethics",
};

const collectionLabel: Record<string, string> = {
  religious: "Religious texts",
  philosophy: "Philosophy",
  ethics: "Ethics",
};

export function collectionIdFor(label: string): string {
  const slug = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return labelToCollectionId[label] ?? (slug || "custom");
}

export function collectionLabelFor(id: string): string {
  return collectionLabel[id] ?? id;
}

export function adminToEntries(admin: AdminData): Entry[] {
  return admin.entries.map((e) => {
    const collection = collectionIdFor(e.category);
    const breadcrumb = ["Sources", collectionLabelFor(collection), e.subCategory || e.title].join(
      " / ",
    );

    const editorial = admin.commentaries
      .filter((c) => c.entryId === e.id && !c.seeded)
      .map((c) => ({
        id: c.id,
        title: "Editorial commentary",
        body: c.text,
        citations: [
          {
            id: `${c.id}-cit`,
            label: c.scholar,
            detail: [c.book, c.volumePage].filter(Boolean).join(" · "),
            status: c.status,
            archive: c.sourceRef,
          },
        ],
      }));

    return {
      id: e.id,
      kind: e.kind,
      collection,
      breadcrumb,
      title: e.title,
      subtitle: e.reference,
      primary: e.originalText,
      secondary: e.translation,
      sections: [...e.sections, ...editorial],
      rebuttals: admin.rebuttals
        .filter((r) => r.entryId === e.id)
        .map((r) => ({
          id: r.id,
          perspective: r.stance,
          claim: r.text,
          status: r.status,
          ...(r.counter ? { counter: r.counter } : {}),
          citations: r.citations,
          ...(r.warrant ? { warrant: r.warrant } : {}),
          ...(r.backing ? { backing: r.backing } : {}),
          ...(r.qualifier ? { qualifier: r.qualifier } : {}),
        })),
      map: e.map,
      translations: e.translations,
      related: e.related,
    } satisfies Entry;
  });
}

export function collectionsFor(entries: Entry[]): { id: string; label: string }[] {
  const seen = new Map<string, string>();
  for (const e of entries) {
    if (!seen.has(e.collection)) seen.set(e.collection, collectionLabelFor(e.collection));
  }
  return Array.from(seen.entries()).map(([id, label]) => ({ id, label }));
}
