import type { Entry } from "@/lib/corpus";
import { allCitations } from "@/lib/corpus";

export function dossierMarkdown(entry: Entry): string {
  const lines: string[] = [];
  lines.push(`# ${entry.title}`);
  lines.push(`*${entry.subtitle}*`);
  lines.push("");
  lines.push("## Primary text");
  lines.push(entry.primary);
  lines.push("");
  lines.push(`> ${entry.secondary}`);
  for (const t of entry.translations) {
    lines.push("");
    lines.push(`**${t.label}:** ${t.text}`);
  }
  if (entry.sections.length > 0) {
    lines.push("");
    lines.push("## Commentary");
    for (const s of entry.sections) {
      lines.push(`### ${s.title}`);
      lines.push(s.body);
      if (s.citations.length > 0) {
        lines.push("");
        for (const c of s.citations) {
          lines.push(`- [${c.status}] ${c.label} — ${c.detail} (${c.archive})`);
        }
      }
    }
  }
  if (entry.rebuttals.length > 0) {
    lines.push("");
    lines.push("## Rebuttals");
    for (const r of entry.rebuttals) {
      lines.push(`### ${r.perspective} — ${r.claim}`);
      if (r.warrant) lines.push(`- **Warrant:** ${r.warrant}`);
      if (r.backing) lines.push(`- **Backing:** ${r.backing}`);
      if (r.qualifier) lines.push(`- **Qualifier:** ${r.qualifier}`);
      if (r.counter) lines.push(`- **Counter (${r.counter.author}):** ${r.counter.body}`);
      for (const c of r.citations) {
        lines.push(`- [${c.status}] ${c.label} — ${c.detail} (${c.archive})`);
      }
    }
  }
  return lines.join("\n");
}

export function dossierBibTeX(entry: Entry): string {
  const seen = new Map<string, number>();
  const items: string[] = [];
  for (const c of allCitations(entry)) {
    const base = c.label.replace(/[^a-zA-Z0-9]/g, "").toLowerCase() || "citation";
    const suffix = seen.get(c.label) ?? 0;
    seen.set(c.label, suffix + 1);
    const citeKey = suffix > 0 ? `${base}${suffix}` : base;
    items.push(
      `@misc{${citeKey},\n  title = {${c.detail}},\n  note = {Archive: ${c.archive}; status: ${c.status}},\n  related = {${entry.title}}\n}`,
    );
  }
  return items.join("\n\n");
}
