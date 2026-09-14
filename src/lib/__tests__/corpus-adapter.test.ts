import { describe, expect, it } from "vitest";
import { seedData } from "@/lib/admin-store";
import { adminToEntries, collectionsFor } from "@/lib/corpus-adapter";

describe("adminToEntries", () => {
  it("maps seed data back to corpus entries faithfully", () => {
    const admin = seedData();
    const entries = adminToEntries(admin);
    expect(entries.length).toBe(admin.entries.length);
    const first = entries[0]!;
    expect(first.primary).toBe(admin.entries[0]!.originalText);
    expect(first.secondary).toBe(admin.entries[0]!.translation);
    expect(first.subtitle).toBe(admin.entries[0]!.reference);
    expect(first.sections.length).toBeGreaterThan(0);
    expect(first.map.nodes.length).toBeGreaterThan(0);
    const expectedRebut = admin.rebuttals.filter((r) => r.entryId === first.id);
    expect(first.rebuttals).toHaveLength(expectedRebut.length);
    expect(first.rebuttals[0]?.counter).toEqual(expectedRebut[0]?.counter);
    expect(first.rebuttals[0]?.citations).toEqual(expectedRebut[0]?.citations);
  });

  it("reflects title edits", () => {
    const admin = seedData();
    admin.entries[0]!.title = "Renamed Entry";
    expect(adminToEntries(admin)[0]!.title).toBe("Renamed Entry");
  });

  it("merges admin commentaries as an editorial section", () => {
    const admin = seedData();
    const firstId = admin.entries[0]!.id;
    admin.commentaries.push({
      id: "com-new",
      entryId: firstId,
      scholar: "New Scholar",
      text: "A brand-new note.",
      book: "Some Book",
      volumePage: "p. 10",
      sourceRef: "Archive X",
      status: "verified",
      seeded: false,
    });
    const entry = adminToEntries(admin).find((e) => e.id === firstId)!;
    const editorial = entry.sections.filter((s) => s.title === "Editorial commentary").at(-1);
    expect(editorial?.body).toBe("A brand-new note.");
    expect(editorial?.citations[0]?.label).toBe("New Scholar");
    expect(editorial?.citations[0]?.status).toBe("verified");
  });

  it("maps unknown category labels to slugged collection ids", () => {
    const admin = seedData();
    admin.entries[0]!.category = "Political Thought";
    expect(adminToEntries(admin)[0]!.collection).toBe("political-thought");
  });

  it("maps known labels back to the corpus collection ids", () => {
    const admin = seedData();
    const entries = adminToEntries(admin);
    const ids = entries.map((e) => e.collection);
    expect(ids).toContain("religious");
    expect(ids).toContain("philosophy");
    expect(ids).toContain("ethics");
  });
});

describe("collectionsFor", () => {
  it("derives unique collections from entries with canonical labels", () => {
    const admin = seedData();
    const cols = collectionsFor(adminToEntries(admin));
    expect(cols.find((c) => c.id === "religious")?.label).toBe("Religious texts");
    expect(cols.find((c) => c.id === "philosophy")?.label).toBe("Philosophy");
  });
});
