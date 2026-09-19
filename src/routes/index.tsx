import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Link2, Menu } from "lucide-react";
import { citationCount } from "@/lib/corpus";
import { useCorpus } from "@/lib/use-corpus";
import { getClientId } from "@/lib/client-id";
import { dossierBibTeX, dossierMarkdown } from "@/lib/dossier";
import { castVote, getVotesFor, listPaths } from "@/lib/corpus-api";
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

type Tab = "text" | "rebuttals" | "map";

const tabs: { id: Tab; label: string }[] = [
  { id: "text", label: "Primary text" },
  { id: "rebuttals", label: "Rebuttals" },
  { id: "map", label: "Argument map" },
];

const param = (key: string): string =>
  typeof window === "undefined" ? "" : (new URLSearchParams(window.location.search).get(key) ?? "");

function downloadFile(name: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function ReadingRoom() {
  const queryClient = useQueryClient();
  const { entries, collections } = useCorpus();
  const clientId = useMemo(getClientId, []);

  const [selectedId, setSelectedId] = useState(() => {
    const fromUrl = param("entry");
    return fromUrl && entries.some((e) => e.id === fromUrl) ? fromUrl : (entries[0]?.id ?? "");
  });
  const [query, setQuery] = useState("");
  const [collection, setCollection] = useState<string | null>(null);
  const [perspective, setPerspective] = useState<string | null>(null);
  const [focusedNode, setFocusedNode] = useState<string | null>(param("node") || null);
  const [ledgerOpen, setLedgerOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("text");
  const [corpusOpen, setCorpusOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [activePathId, setActivePathId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: paths } = useQuery({ queryKey: ["paths"], queryFn: listPaths });

  useEffect(() => {
    if (selectedId && !entries.some((e) => e.id === selectedId)) {
      setSelectedId(entries[0]?.id ?? "");
    }
  }, [entries, selectedId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setCorpusOpen(false);
        setMapOpen(false);
        setLedgerOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const activePath = paths?.find((p) => p.id === activePathId) ?? null;
  const pathIds = activePath?.entryIds ?? null;
  const visibleEntries = useMemo(() => {
    if (!pathIds) return entries;
    return pathIds
      .map((id) => entries.find((e) => e.id === id))
      .filter((e): e is (typeof entries)[number] => Boolean(e));
  }, [entries, pathIds]);

  const entry = visibleEntries.find((e) => e.id === selectedId) ?? visibleEntries[0] ?? null;

  useEffect(() => {
    if (entry && entry.id !== selectedId) setSelectedId(entry.id);
  }, [entry, selectedId]);

  // Keep the URL shareable: /?entry=<id>&node=<id>
  useEffect(() => {
    if (!entry || typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    params.set("entry", entry.id);
    if (focusedNode) params.set("node", focusedNode);
    else params.delete("node");
    const next = `${window.location.pathname}?${params.toString()}`;
    if (window.location.search !== `?${params.toString()}`) {
      window.history.replaceState(null, "", next);
    }
  }, [entry, focusedNode]);

  const pathIndex = activePath && entry ? activePath.entryIds.indexOf(entry.id) : -1;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  const rebuttalIds = entry?.rebuttals.map((r) => r.id) ?? [];
  const { data: votes } = useQuery({
    queryKey: ["votes", entry?.id],
    queryFn: () =>
      getVotesFor({ data: { targetType: "rebuttal", targetIds: rebuttalIds, clientId } }),
    enabled: rebuttalIds.length > 0,
  });

  const cast = async (id: string, direction: -1 | 0 | 1) => {
    await castVote({ data: { targetType: "rebuttal", targetId: id, clientId, direction } });
    await queryClient.invalidateQueries({ queryKey: ["votes"] });
  };

  const select = (id: string) => {
    setSelectedId(id);
    setPerspective(null);
    setFocusedNode(null);
    setCorpusOpen(false);
  };

  const enterPath = (id: string | null) => {
    setActivePathId(id);
    if (id) {
      const p = paths?.find((x) => x.id === id);
      if (p && p.entryIds[0]) select(p.entryIds[0]);
    }
  };

  const step = (dir: -1 | 1) => {
    if (!activePath || !entry) return;
    const i = activePath.entryIds.indexOf(entry.id);
    const next = activePath.entryIds[i + dir];
    if (next) select(next);
  };

  const related = useMemo(
    () =>
      (entry?.related ?? [])
        .map((id) => {
          const e = entries.find((x) => x.id === id);
          return e ? { id, title: e.title } : null;
        })
        .filter((x): x is { id: string; title: string } => Boolean(x)),
    [entry, entries],
  );

  if (!entry) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-gradient-to-b from-[oklch(0.965_0.008_255)] to-[oklch(0.905_0.02_258)] font-sans text-ink">
        <p className="rounded-2xl bg-white/50 px-6 py-8 text-center font-serif text-[15px] text-steel ring-1 ring-white/70 backdrop-blur-xl">
          The corpus is empty. Add entries in the admin area to populate the reading room.
        </p>
      </div>
    );
  }

  return (
    <div className="relative flex h-dvh w-full overflow-hidden bg-gradient-to-b from-[oklch(0.965_0.008_255)] via-[oklch(0.945_0.012_255)] to-[oklch(0.905_0.02_258)] font-sans text-ink">
      <div className="pointer-events-none absolute -top-24 -left-24 size-[420px] rounded-full bg-[oklch(0.84_0.05_262)]/50 blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 -right-32 size-[460px] rounded-full bg-[oklch(0.88_0.03_262)]/60 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 size-[380px] rounded-full bg-[oklch(0.95_0.02_262)]/70 blur-3xl" />

      {corpusOpen && (
        <button
          aria-label="Close corpus"
          onClick={() => setCorpusOpen(false)}
          className="fixed inset-0 z-30 bg-ink/20 backdrop-blur-sm lg:hidden"
        />
      )}

      <div
        className={`fixed inset-y-0 left-0 z-40 w-72 transform-gpu transition-transform duration-200 lg:relative lg:z-0 lg:translate-x-0 lg:w-64 xl:w-72 ${
          corpusOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <CorpusSidebar
          entries={visibleEntries}
          collections={collections}
          selectedId={entry.id}
          onSelect={select}
          query={query}
          onQueryChange={setQuery}
          activeCollection={collection}
          onCollectionChange={setCollection}
          paths={paths ?? []}
          activePath={activePathId}
          onPathChange={enterPath}
          onClose={() => setCorpusOpen(false)}
          className="shadow-2xl lg:shadow-none"
        />
      </div>

      <div className="relative flex min-w-0 flex-1 overflow-hidden">
        <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
          <div className="relative border-b border-white/60 bg-white/25 backdrop-blur-xl">
            <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:px-6 lg:px-7">
              <button
                onClick={() => setCorpusOpen(true)}
                aria-label="Open corpus"
                className="-ml-2 rounded-md p-2 text-ink transition-colors hover:bg-white/50 lg:hidden"
              >
                <Menu className="size-5" />
              </button>
              <div className="min-w-0 truncate font-mono text-[11px] uppercase tracking-[0.18em] text-mist">
                {entry.breadcrumb}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="hidden rounded-md bg-white/50 px-2.5 py-1 font-mono text-[10px] text-steel ring-1 ring-white/70 sm:inline-block">
                  {citationCount(entry)} citations
                </span>
                <button
                  onClick={copyLink}
                  className="hidden rounded-md bg-white/60 px-3 py-1.5 text-[12px] font-medium text-steel ring-1 ring-white/80 transition-colors hover:bg-white/80 sm:inline-block"
                >
                  {copied ? "Copied" : "Copy link"}
                </button>
                <button
                  onClick={() =>
                    downloadFile(`${entry.id}.md`, dossierMarkdown(entry), "text/markdown")
                  }
                  className="hidden rounded-md bg-white/60 px-3 py-1.5 text-[12px] font-medium text-steel ring-1 ring-white/80 transition-colors hover:bg-white/80 md:inline-block"
                >
                  Dossier
                </button>
                <button
                  onClick={() =>
                    downloadFile(`${entry.id}.bib`, dossierBibTeX(entry), "application/x-bibtex")
                  }
                  className="hidden rounded-md bg-white/60 px-3 py-1.5 text-[12px] font-medium text-steel ring-1 ring-white/80 transition-colors hover:bg-white/80 md:inline-block"
                >
                  BibTeX
                </button>
                <button
                  onClick={() => setMapOpen((v) => !v)}
                  className="hidden rounded-md bg-white/60 px-3 py-1.5 text-[12px] font-medium text-steel ring-1 ring-white/80 transition-colors hover:bg-white/80 lg:inline-block xl:hidden"
                >
                  {mapOpen ? "Hide map" : "Show map"}
                </button>
                <button
                  onClick={() => setLedgerOpen((v) => !v)}
                  className="rounded-md bg-ink px-3 py-1.5 text-[12px] font-medium text-paper ring-1 ring-ink/10 transition-opacity hover:opacity-90"
                >
                  {ledgerOpen ? "Hide sources" : "Verify sources"}
                </button>
              </div>
            </div>
            <div className="flex items-end gap-3 px-4 pb-4 sm:px-6 lg:px-7">
              <div className="min-w-0 flex-1">
                <h1 className="font-serif text-xl leading-tight font-medium text-balance text-ink sm:text-2xl">
                  {entry.title}
                </h1>
                <p className="mt-0.5 text-[13px] text-mist">{entry.subtitle}</p>
                {activePath && pathIndex >= 0 && (
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-mist">
                    Path: {activePath.title} — {pathIndex + 1} of {activePath.entryIds.length}
                  </p>
                )}
              </div>
              {activePath && pathIndex >= 0 && (
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => step(-1)}
                    disabled={pathIndex === 0}
                    aria-label="Previous in path"
                    className="rounded-md p-2 text-steel transition-colors hover:bg-white/50 disabled:opacity-30"
                  >
                    <ChevronLeft className="size-4" />
                  </button>
                  <button
                    onClick={() => step(1)}
                    disabled={pathIndex === activePath.entryIds.length - 1}
                    aria-label="Next in path"
                    className="rounded-md p-2 text-steel transition-colors hover:bg-white/50 disabled:opacity-30"
                  >
                    <ChevronRight className="size-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 border-b border-white/60 bg-white/25 px-4 py-2 backdrop-blur-xl lg:hidden">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`min-h-10 flex-1 rounded-lg px-2 text-[12.5px] font-medium transition-colors ${
                  tab === t.id
                    ? "bg-ink/90 text-paper ring-1 ring-ink/10"
                    : "text-steel hover:bg-white/50"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex min-h-0 flex-1">
            <div
              className={`min-w-0 w-full ${tab === "text" ? "flex" : "hidden"} lg:flex lg:w-[46%]`}
            >
              <PrimaryPane key={entry.id} entry={entry} onSelectEntry={select} related={related} />
            </div>
            <div className={`min-w-0 flex-1 ${tab === "rebuttals" ? "flex" : "hidden"} lg:flex`}>
              <RebuttalPane
                entry={entry}
                activePerspective={perspective}
                onPerspectiveChange={setPerspective}
                votes={votes ?? {}}
                onVote={cast}
              />
            </div>
            <div className={`min-w-0 flex-1 ${tab === "map" ? "flex" : "hidden"} lg:hidden`}>
              <ArgumentMap
                entry={entry}
                focused={focusedNode}
                onFocus={setFocusedNode}
                className="flex w-full"
              />
            </div>
          </div>

          {ledgerOpen && <CitationLedger entry={entry} onClose={() => setLedgerOpen(false)} />}
        </main>

        <ArgumentMap
          entry={entry}
          focused={focusedNode}
          onFocus={setFocusedNode}
          className="hidden w-72 border-l border-white/60 xl:flex"
        />

        {mapOpen && (
          <div className="fixed inset-0 z-40 hidden lg:block xl:hidden">
            <button
              aria-label="Close argument map"
              onClick={() => setMapOpen(false)}
              className="absolute inset-0 bg-ink/20 backdrop-blur-sm"
            />
            <div className="absolute inset-y-0 right-0 w-80 max-w-[85vw] overflow-hidden border-l border-white/60 bg-white/50 shadow-2xl backdrop-blur-xl">
              <ArgumentMap
                entry={entry}
                focused={focusedNode}
                onFocus={setFocusedNode}
                className="flex h-full w-full"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
