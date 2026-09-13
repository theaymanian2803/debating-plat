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
