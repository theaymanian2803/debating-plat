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
    expect(JSON.parse(rows.rebuttals[0]!.citations as string)).toEqual(
      data.rebuttals[0]!.citations,
    );
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
