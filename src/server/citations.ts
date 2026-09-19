import type { AdminData, AdminEntry, AdminRebuttal } from "@/lib/admin-store";

// Returns copies of every entry and rebuttal whose citations mention `needle`,
// with any matching non-verified citation promoted to `verified`. Unchanged
// records are omitted so callers only rewrite rows that actually moved.
export function markCitationsVerified(
  data: AdminData,
  needle: string,
): { entries: Map<string, AdminEntry>; rebuttals: Map<string, AdminRebuttal> } {
  const key = needle.trim().toLowerCase();
  const entries = new Map<string, AdminEntry>();
  const rebuttals = new Map<string, AdminRebuttal>();

  for (const e of data.entries) {
    let touched = false;
    const sections = e.sections.map((s) => {
      const citations = s.citations.map((c) => {
        if (c.status === "verified") return c;
        if (c.detail.toLowerCase().includes(key) || c.label.toLowerCase().includes(key)) {
          touched = true;
          return { ...c, status: "verified" as const };
        }
        return c;
      });
      return touched ? { ...s, citations } : s;
    });
    if (touched) entries.set(e.id, { ...e, sections });
  }

  for (const r of data.rebuttals) {
    let touched = false;
    const citations = r.citations.map((c) => {
      if (c.status === "verified") return c;
      if (c.detail.toLowerCase().includes(key) || c.label.toLowerCase().includes(key)) {
        touched = true;
        return { ...c, status: "verified" as const };
      }
      return c;
    });
    if (touched) rebuttals.set(r.id, { ...r, citations });
  }

  return { entries, rebuttals };
}
