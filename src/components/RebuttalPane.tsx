import type { Entry } from "@/lib/corpus";
import { StatusBadge } from "./StatusBadge";
import { ArrowDown, ArrowUp } from "lucide-react";

export type VoteTallyUI = { up: number; down: number; mine: number };

export function RebuttalPane({
  entry,
  activePerspective,
  onPerspectiveChange,
  votes,
  onVote,
}: {
  entry: Entry;
  activePerspective: string | null;
  onPerspectiveChange: (p: string | null) => void;
  votes?: Record<string, VoteTallyUI>;
  onVote?: (rebuttalId: string, direction: -1 | 0 | 1) => void;
}) {
  const perspectives = Array.from(new Set(entry.rebuttals.map((r) => r.perspective)));
  const shown = activePerspective
    ? entry.rebuttals.filter((r) => r.perspective === activePerspective)
    : entry.rebuttals;

  return (
    <section className="flex flex-1 flex-col overflow-hidden bg-white/10 backdrop-blur-xl">
      <div className="flex items-center gap-2 border-b border-white/60 px-4 py-2.5 sm:px-6">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-mist">
          Rebuttals by perspective
        </span>
        <div className="ml-auto flex flex-wrap gap-1">
          {perspectives.map((p) => (
            <button
              key={p}
              onClick={() => onPerspectiveChange(activePerspective === p ? null : p)}
              className={`min-h-8 rounded-md px-2.5 py-1 font-mono text-[10px] transition-colors ${
                activePerspective === p
                  ? "bg-white/60 text-ink ring-1 ring-white/70"
                  : "text-mist hover:bg-white/50"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-6">
        {shown.map((r) => {
          const tally = votes?.[r.id] ?? { up: 0, down: 0, mine: 0 };
          return (
            <div key={r.id} className="rounded-xl bg-white/55 p-4 ring-1 ring-white/70">
              <div className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate font-mono text-[10px] uppercase tracking-[0.15em] text-steel">
                  {r.perspective} — claim
                </span>
                <div className="flex shrink-0 items-center gap-1.5">
                  <span className="flex items-center gap-0.5">
                    <button
                      onClick={() => onVote?.(r.id, tally.mine === 1 ? 0 : 1)}
                      aria-label="Support this rebuttal"
                      className={`rounded-md p-1 transition-colors ${
                        tally.mine === 1
                          ? "text-verify"
                          : "text-mist hover:bg-white/60 hover:text-ink"
                      }`}
                    >
                      <ArrowUp className="size-3.5" />
                    </button>
                    <span className="min-w-4 text-center font-mono text-[10px] text-steel">
                      {tally.up}
                    </span>
                    <button
                      onClick={() => onVote?.(r.id, tally.mine === -1 ? 0 : -1)}
                      aria-label="Challenge this rebuttal"
                      className={`rounded-md p-1 transition-colors ${
                        tally.mine === -1
                          ? "text-dispute"
                          : "text-mist hover:bg-white/60 hover:text-ink"
                      }`}
                    >
                      <ArrowDown className="size-3.5" />
                    </button>
                    <span className="min-w-4 text-center font-mono text-[10px] text-steel">
                      {tally.down}
                    </span>
                  </span>
                  <StatusBadge status={r.status} />
                </div>
              </div>
              <p className="mt-1.5 font-serif text-[14px] leading-snug text-ink">
                {r.qualifier ? <em className="mr-1 text-mist">{r.qualifier}</em> : null}
                {r.claim}
              </p>

              {(r.warrant || r.backing) && (
                <div className="mt-2.5 space-y-1 rounded-lg bg-white/40 px-3 py-2.5 ring-1 ring-white/70">
                  {r.warrant && (
                    <div className="flex gap-2 text-[12px] leading-snug">
                      <span className="shrink-0 font-mono text-[9px] uppercase tracking-[0.14em] text-mist">
                        Warrant
                      </span>
                      <span className="text-steel">{r.warrant}</span>
                    </div>
                  )}
                  {r.backing && (
                    <div className="flex gap-2 text-[12px] leading-snug">
                      <span className="shrink-0 font-mono text-[9px] uppercase tracking-[0.14em] text-mist">
                        Backing
                      </span>
                      <span className="text-steel">{r.backing}</span>
                    </div>
                  )}
                </div>
              )}

              {r.counter && (
                <div
                  className={`mt-3 border-l-2 pl-3 ${
                    r.counter.status === "verified"
                      ? "border-verify/40"
                      : r.counter.status === "disputed"
                        ? "border-dispute/40"
                        : "border-unv/40"
                  }`}
                >
                  <div
                    className={`font-mono text-[9px] uppercase tracking-[0.15em] ${
                      r.counter.status === "verified"
                        ? "text-verify"
                        : r.counter.status === "disputed"
                          ? "text-dispute"
                          : "text-unv"
                    }`}
                  >
                    Counter — {r.counter.author}
                  </div>
                  <p className="mt-1 text-[12.5px] leading-snug text-steel">{r.counter.body}</p>
                </div>
              )}

              <div className="mt-3 space-y-1.5 border-t border-white/70 pt-2.5">
                {r.citations.map((c) => (
                  <p key={c.id} className="font-mono text-[10px] leading-relaxed text-mist">
                    {c.detail} <span className="text-steel">· {c.archive}</span>
                  </p>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
