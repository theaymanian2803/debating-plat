import { useState } from "react";
import type { Citation, Entry } from "@/lib/corpus";
import { StatusBadge, StatusDot } from "./StatusBadge";

function CitationRow({ c }: { c: Citation }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-1">
        <StatusDot status={c.status} />
      </span>
      <p className="font-mono text-[11px] leading-relaxed text-steel">
        {c.detail} <span className="text-mist">· {c.archive}</span>
      </p>
    </div>
  );
}

export function PrimaryPane({
  entry,
  onSelectEntry,
  related,
}: {
  entry: Entry;
  onSelectEntry?: (id: string) => void;
  related?: { id: string; title: string }[];
}) {
  const [open, setOpen] = useState<string[]>([entry.sections[0]?.id ?? ""]);
  const [translation, setTranslation] = useState<string | null>(null);
  const toggle = (id: string) =>
    setOpen((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const active = entry.translations.find((t) => t.label === translation) ?? null;

  return (
    <section className="flex w-full flex-col overflow-hidden bg-white/20 backdrop-blur-2xl lg:border-r lg:border-white/50">
      <div className="flex items-center justify-between border-b border-white/60 px-4 py-2.5 sm:px-6">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-mist">
          Primary text
        </span>
        <span className="truncate font-mono text-[10px] text-mist">
          {entry.breadcrumb.split("/").pop()}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6 lg:px-7">
        <p className="font-serif text-[17px] leading-[1.75] text-pretty text-ink">
          {entry.primary}
        </p>

        {active ? (
          <div className="mt-4 rounded-xl bg-white/45 p-4 ring-1 ring-white/70">
            <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-mist">
              {active.label}
            </div>
            <p className="mt-1.5 font-serif text-[15px] leading-[1.7] text-pretty italic text-steel">
              {active.text}
            </p>
          </div>
        ) : (
          <p className="mt-4 font-serif text-[15px] leading-[1.7] text-pretty italic text-steel">
            {entry.secondary}
          </p>
        )}

        {entry.translations.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            <button
              onClick={() => setTranslation(null)}
              className={`rounded-md px-2.5 py-1 font-mono text-[10px] transition-colors ${
                translation === null
                  ? "bg-ink/90 text-paper ring-1 ring-ink/10"
                  : "bg-white/60 text-steel ring-1 ring-white/80 hover:bg-white/85"
              }`}
            >
              Official translation
            </button>
            {entry.translations.map((t) => (
              <button
                key={t.label}
                onClick={() => setTranslation(t.label)}
                className={`rounded-md px-2.5 py-1 font-mono text-[10px] transition-colors ${
                  translation === t.label
                    ? "bg-ink/90 text-paper ring-1 ring-ink/10"
                    : "bg-white/60 text-steel ring-1 ring-white/80 hover:bg-white/85"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        {entry.sections.map((s) => {
          const isOpen = open.includes(s.id);
          return (
            <div key={s.id} className="mt-7">
              <button
                onClick={() => toggle(s.id)}
                className="flex w-full items-center gap-2 border-b border-white/60 pb-2 text-left"
              >
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-mist">
                  {s.title}
                </span>
                <span className="ml-auto font-mono text-[10px] text-mist">
                  {isOpen ? "− collapse" : `+ ${s.citations.length} cited`}
                </span>
              </button>
              {isOpen && (
                <div className="pt-3">
                  <p className="text-[13px] leading-[1.7] text-pretty text-steel">{s.body}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {s.citations.map((c) => (
                      <StatusBadge
                        key={c.id}
                        status={c.status}
                        label={`${c.label} · ${c.status}`}
                        className="px-2.5 py-1"
                      />
                    ))}
                  </div>
                  <div className="mt-3 space-y-2.5">
                    {s.citations.map((c) => (
                      <CitationRow key={`row-${c.id}`} c={c} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {related && related.length > 0 && (
          <div className="mt-7 border-t border-white/60 pt-4">
            <div className="pb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-mist">
              Cross-references
            </div>
            <div className="flex flex-wrap gap-1.5">
              {related.map((r) => (
                <button
                  key={r.id}
                  onClick={() => onSelectEntry?.(r.id)}
                  className="rounded-full bg-white/60 px-2.5 py-1 font-mono text-[10px] text-steel ring-1 ring-white/80 transition-colors hover:bg-white/85"
                >
                  {r.title}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
