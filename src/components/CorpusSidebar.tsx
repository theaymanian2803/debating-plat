import type { Entry } from "@/lib/corpus";
import { searchText } from "@/lib/corpus";
import { X } from "lucide-react";

export type ReadingPathUI = { id: string; title: string; description: string; entryIds: string[] };

export function CorpusSidebar({
  entries,
  collections,
  selectedId,
  onSelect,
  query,
  onQueryChange,
  activeCollection,
  onCollectionChange,
  paths = [],
  activePath,
  onPathChange,
  onClose,
  className = "",
}: {
  entries: Entry[];
  collections: { id: string; label: string }[];
  selectedId: string;
  onSelect: (id: string) => void;
  query: string;
  onQueryChange: (v: string) => void;
  activeCollection: string | null;
  onCollectionChange: (id: string | null) => void;
  paths?: ReadingPathUI[];
  activePath?: string | null;
  onPathChange?: (id: string | null) => void;
  onClose?: () => void;
  className?: string;
}) {
  const matches = (e: Entry) =>
    (!activeCollection || e.collection === activeCollection) &&
    (query.trim() === "" || searchText(e).includes(query.toLowerCase()));

  const verses = entries.filter((e) => e.kind === "verse" && matches(e));
  const premises = entries.filter((e) => e.kind === "premise" && matches(e));

  const item = (e: Entry) => (
    <button
      key={e.id}
      onClick={() => onSelect(e.id)}
      className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-[13px] transition-colors ${
        e.id === selectedId
          ? "bg-ink/90 font-medium text-paper ring-1 ring-ink/10"
          : "text-steel hover:bg-white/50"
      }`}
    >
      <span className="min-w-0 flex-1 truncate">{e.title}</span>
    </button>
  );

  return (
    <aside
      className={`flex flex-col overflow-y-auto border-r border-white/60 bg-white/35 backdrop-blur-xl ${className}`}
    >
      <div className="flex items-center gap-2.5 px-4 pt-5 pb-4 sm:px-5">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-ink font-serif text-lg leading-none text-paper">
          S
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold leading-tight tracking-tight">Scholia</div>
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-mist">
            Reading room
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Close corpus"
            className="rounded-md p-2 text-steel transition-colors hover:bg-white/50 lg:hidden"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      <div className="mx-4 rounded-lg bg-white/40 px-3 py-2 ring-1 ring-white/60">
        <input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="SEARCH CORPUS"
          className="w-full bg-transparent font-mono text-[10px] uppercase tracking-[0.15em] text-ink placeholder:text-mist focus:outline-none"
        />
      </div>

      <nav className="px-3 pt-4 pb-6">
        {paths.length > 0 && (
          <>
            <div className="px-2 pb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-mist">
              Reading paths
            </div>
            <div className="space-y-1">
              {paths.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    onPathChange?.(activePath === p.id ? null : p.id);
                    onClose?.();
                  }}
                  className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-[13px] transition-colors ${
                    activePath === p.id ? "bg-ink/90 text-paper" : "text-steel hover:bg-white/50"
                  }`}
                >
                  <span className="size-1.5 shrink-0 rounded-full bg-dispute/70" />
                  <span className="min-w-0 flex-1 truncate">{p.title}</span>
                  <span className="font-mono text-[10px] text-mist">{p.entryIds.length}</span>
                </button>
              ))}
              {activePath && (
                <button
                  onClick={() => onPathChange?.(null)}
                  className="w-full rounded-md px-3 py-1.5 text-left font-mono text-[10px] text-mist transition-colors hover:bg-white/50"
                >
                  Clear path
                </button>
              )}
            </div>
          </>
        )}

        <div className="px-2 pb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-mist">
          Verses
        </div>
        {verses.length ? (
          verses.map(item)
        ) : (
          <p className="px-3 py-1 font-mono text-[10px] text-mist">No matches</p>
        )}

        <div className="px-2 pt-5 pb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-mist">
          Premises
        </div>
        {premises.length ? (
          premises.map(item)
        ) : (
          <p className="px-3 py-1 font-mono text-[10px] text-mist">No matches</p>
        )}

        <div className="px-2 pt-5 pb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-mist">
          Collections
        </div>
        {collections.map((c) => (
          <button
            key={c.id}
            onClick={() => onCollectionChange(activeCollection === c.id ? null : c.id)}
            className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-[13px] transition-colors ${
              activeCollection === c.id ? "bg-white/70 text-ink" : "text-steel hover:bg-white/50"
            }`}
          >
            <span
              className={`size-1.5 shrink-0 rounded-full ${activeCollection === c.id ? "bg-verify" : "bg-steel/50"}`}
            />
            {c.label}
            <span className="ml-auto font-mono text-[10px] text-mist">
              {entries.filter((e) => e.collection === c.id).length}
            </span>
          </button>
        ))}

        <div className="px-2 pt-5 pb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-mist">
          Recently cited
        </div>
        <p className="px-3 py-1 text-[12px] leading-snug text-mist">
          Aristotle, Nicomachean Ethics
        </p>
        <p className="px-3 py-1 text-[12px] leading-snug text-mist">Meditations, III.1</p>
      </nav>
    </aside>
  );
}
