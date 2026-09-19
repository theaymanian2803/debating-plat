import { describe, expect, it } from "vitest";
import { markCitationsVerified } from "@/server/citations";
import { seedData, type AdminData } from "@/lib/admin-store";

const base = (): AdminData => {
  const data = seedData();
  return data;
};

describe("markCitationsVerified", () => {
  it("promotes matching citations to verified and leaves others alone", () => {
    const data = base();
    const detail = "Whitman, E. \u201cTrained Assent.\u201d Ancient Philosophy 15 (1995).";
    const { entries } = markCitationsVerified(data, "Trained Assent");

    let saw = false;
    for (const entry of entries.values()) {
      for (const s of entry.sections) {
        for (const c of s.citations) {
          if (c.detail === detail) {
            saw = true;
            expect(c.status).toBe("verified");
          }
        }
      }
    }
    expect(saw).toBe(true);

    const untouched = data.entries.find((e) => e.id === "genesis-1-1")!;
    expect(
      untouched.sections.flatMap((s) => s.citations).every((c) => c.status !== "verified"),
    ).toBe(false);
  });

  it("matches rebuttal citations too", () => {
    const data = base();
    const { rebuttals } = markCitationsVerified(data, "Nicomachean Ethics");
    let saw = false;
    for (const rebuttal of rebuttals.values()) {
      for (const c of rebuttal.citations) {
        if (c.label.includes("Nicomachean Ethics")) {
          saw = true;
          expect(c.status).toBe("verified");
        }
      }
    }
    expect(saw).toBe(true);
  });

  it("returns empty maps when nothing matches", () => {
    const data = base();
    const { entries, rebuttals } = markCitationsVerified(data, "no such source anywhere");
    expect(entries.size).toBe(0);
    expect(rebuttals.size).toBe(0);
  });
});
