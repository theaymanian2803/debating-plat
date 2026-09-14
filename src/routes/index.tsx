import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { citationCount } from "@/lib/corpus";
import { useCorpus } from "@/lib/use-corpus";
import { CorpusSidebar } from "@/components/CorpusSidebar";
import { PrimaryPane } from "@/components/PrimaryPane";
import { RebuttalPane } from "@/components/RebuttalPane";
import { ArgumentMap } from "@/components/ArgumentMap";
import { CitationLedger } from "@/components/CitationLedger";

const title = "Scholia — Reading room for verified debate";
const description =
  "A scholarly debate workspace: primary texts with expandable commentary, structured rebuttals by perspective, an argument map, and verified citations.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReadingRoom,
});

function ReadingRoom() {
  const { entries, collections } = useCorpus();
  const [selectedId, setSelectedId] = useState(entries[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [collection, setCollection] = useState<string | null>(null);
  const [perspective, setPerspective] = useState<string | null>(null);
  const [focusedNode, setFocusedNode] = useState<string | null>(null);
  const [ledgerOpen, setLedgerOpen] = useState(false);

  useEffect(() => {
    if (selectedId && !entries.some((e) => e.id === selectedId)) {
      setSelectedId(entries[0]?.id ?? "");
    }
  }, [entries, selectedId]);

  const entry = entries.find((e) => e.id === selectedId) ?? entries[0] ?? null;

  if (!entry) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[oklch(0.965_0.008_255)] to-[oklch(0.905_0.02_258)] font-sans text-ink">
        <p className="rounded-2xl bg-white/50 px-6 py-8 text-center font-serif text-[15px] text-steel ring-1 ring-white/70 backdrop-blur-xl">
          The corpus is empty. Add entries in the admin area to populate the reading room.
        </p>
      </div>
    );
  }

  const select = (id: string) => {
    setSelectedId(id);
    setPerspective(null);
    setFocusedNode(null);
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-gradient-to-b from-[oklch(0.965_0.008_255)] via-[oklch(0.945_0.012_255)] to-[oklch(0.905_0.02_258)] font-sans text-ink">
      <div className="pointer-events-none absolute -top-24 -left-24 size-[420px] rounded-full bg-[oklch(0.84_0.05_262)]/50 blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 -right-32 size-[460px] rounded-full bg-[oklch(0.88_0.03_262)]/60 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 size-[380px] rounded-full bg-[oklch(0.95_0.02_262)]/70 blur-3xl" />

      <div className="relative flex h-screen w-full overflow-hidden">
        <CorpusSidebar
          entries={entries}
          collections={collections}
          selectedId={entry.id}
          onSelect={select}
          query={query}
          onQueryChange={setQuery}
          activeCollection={collection}
          onCollectionChange={setCollection}
        />

        <div className="relative flex flex-1 overflow-hidden">
          <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
            <div className="relative border-b border-white/60 bg-white/25 backdrop-blur-xl">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-7 py-3">
                <div className="min-w-0 truncate font-mono text-[11px] uppercase tracking-[0.18em] text-mist">
                  {entry.breadcrumb}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="rounded-md bg-white/50 px-2.5 py-1 font-mono text-[10px] text-steel ring-1 ring-white/70">
                    {citationCount(entry)} citations
                  </span>
                  <button
                    onClick={() => setLedgerOpen((v) => !v)}
                    className="rounded-md bg-ink px-3 py-1.5 text-[12px] font-medium text-paper ring-1 ring-ink/10 transition-opacity hover:opacity-90"
                  >
                    {ledgerOpen ? "Hide sources" : "Verify sources"}
                  </button>
                </div>
              </div>
              <div className="px-7 pb-4">
                <h1 className="font-serif text-2xl leading-tight font-medium text-balance text-ink">
                  {entry.title}
                </h1>
                <p className="mt-0.5 text-[13px] text-mist">{entry.subtitle}</p>
              </div>
            </div>

            <div className="flex min-h-0 flex-1">
              <PrimaryPane key={entry.id} entry={entry} />
              <RebuttalPane
                entry={entry}
                activePerspective={perspective}
                onPerspectiveChange={setPerspective}
              />
            </div>

            {ledgerOpen && <CitationLedger entry={entry} onClose={() => setLedgerOpen(false)} />}
          </main>

          <ArgumentMap entry={entry} focused={focusedNode} onFocus={setFocusedNode} />
        </div>
      </div>
    </div>
  );
}
