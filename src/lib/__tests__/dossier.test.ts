import { describe, expect, it } from "vitest";
import { dossierBibTeX, dossierMarkdown } from "@/lib/dossier";
import { entries } from "@/lib/corpus";

describe("dossier export", () => {
  const entry = entries[0]!;

  it("builds a markdown dossier with headers and citations", () => {
    const md = dossierMarkdown(entry);
    expect(md).toContain(`# ${entry.title}`);
    expect(md).toContain("## Primary text");
    expect(md).toContain("## Commentary");
    expect(md).toContain("## Rebuttals");
    expect(md).toContain("[verified] Burnet 1931");
  });

  it("builds BibTeX entries with stable keys and deduplicates", () => {
    const tex = dossierBibTeX(entry);
    expect(tex).toContain("@misc{");
    expect(tex).toContain("Archive:");
    const keys = [...tex.matchAll(/@misc\{([^,]+),/g)].map((m) => m[1]);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
