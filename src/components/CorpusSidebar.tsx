import type { Entry } from "@/lib/corpus";

export function CorpusSidebar({
  entries,
  collections,
  selectedId,
  onSelect,
  query,
  onQueryChange,
  activeCollection,
  onCollectionChange,
}: {
  entries: Entry[];
  collections: { id: string; label: string }[];
  selectedId: string;
  onSelect: (id: string) => void;
  query: string;
  onQueryChange: (v: string) => void;
  activeCollection: string | null;
  onCollectionChange: (id: string | null) => void;
}) {
  const matches = (e: Entry) =>
    (!activeCollection || e.collection === activeCollection) &&
    (query.trim() === "" ||
      `${e.title} ${e.subtitle} ${e.primary}`.toLowerCase().includes(query.toLowerCase()));

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
    <aside className="relative flex w-72 shrink-0 flex-col overflow-y-auto border-r border-white/60 bg-white/35 backdrop-blur-xl">
      <div className="flex items-center gap-2.5 px-5 pt-5 pb-4">
        <div className="flex size-8 items-center justify-center rounded-lg bg-ink font-serif text-lg leading-none text-paper">
          S
        </div>
        <div>
          <div className="text-sm font-semibold leading-tight tracking-tight">Scholia</div>
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-mist">
            Reading room
          </div>
        </div>
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
