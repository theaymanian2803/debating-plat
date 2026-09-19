import { describe, expect, it } from "vitest";
import { normalizeAdminData, seedData, type AdminData } from "@/lib/admin-store";
import { adminToEntries } from "@/lib/corpus-adapter";
import { entries as corpusEntries } from "@/lib/corpus";

describe("seedData round-trip", () => {
  it("carries sections and map through to admin entries", () => {
    const data = seedData();
    const first = corpusEntries[0]!;
    const adminEntry = data.entries.find((e) => e.id === first.id)!;
    expect(adminEntry.sections).toEqual(first.sections);
    expect(adminEntry.map).toEqual(first.map);
  });

  it("carries counter and citations through to admin rebuttals", () => {
    const data = seedData();
    const first = corpusEntries[0]!;
    const adminRebut = data.rebuttals.filter((r) => r.entryId === first.id);
    expect(adminRebut.map((r) => r.citations)).toEqual(first.rebuttals.map((r) => r.citations));
    expect(adminRebut.map((r) => r.counter)).toEqual(first.rebuttals.map((r) => r.counter));
  });
});

describe("normalizeAdminData", () => {
  function legacyData(): AdminData {
    const data = seedData();
    for (const e of data.entries) {
      delete (e as { sections?: unknown }).sections;
      delete (e as { map?: unknown }).map;
    }
    for (const r of data.rebuttals) {
      delete (r as { citations?: unknown }).citations;
      delete (r as { counter?: unknown }).counter;
    }
    for (const c of data.commentaries) {
      delete (c as { seeded?: unknown }).seeded;
    }
    return data;
  }

  it("fills missing sections and map on legacy entries", () => {
    const normalized = normalizeAdminData(legacyData());
    for (const e of normalized.entries) {
      expect(Array.isArray(e.sections)).toBe(true);
      expect(e.map).toEqual({ nodes: [], edges: [] });
    }
  });

  it("fills missing citations and counter on legacy rebuttals", () => {
    const normalized = normalizeAdminData(legacyData());
    for (const r of normalized.rebuttals) {
      expect(Array.isArray(r.citations)).toBe(true);
      expect(r.counter).toBeUndefined();
    }
  });

  it("fills missing seeded flag on legacy commentaries", () => {
    const normalized = normalizeAdminData(legacyData());
    for (const c of normalized.commentaries) {
      expect(c.seeded).toBe(false);
    }
  });

  it("keeps the home page from crashing on legacy saved data", () => {
    const normalized = normalizeAdminData(legacyData());
    expect(() => adminToEntries(normalized)).not.toThrow();
    expect(adminToEntries(normalized)).toHaveLength(normalized.entries.length);
  });

  it("preserves already-valid data unchanged", () => {
    const data = seedData();
    expect(normalizeAdminData(data)).toEqual(data);
  });
});
