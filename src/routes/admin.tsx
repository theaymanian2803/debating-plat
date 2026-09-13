import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { AdminContext, seedData, type AdminData, type AdminStore } from "@/lib/admin-store";
import { getCorpus, resetCorpus } from "@/lib/corpus-api";
import { Input } from "@/components/admin/ui";

const title = "Scholia Admin — Corpus & citation management";
const description =
  "Manage primary entries, scholarly commentaries, rebuttals, verified sources, and the taxonomy behind the Scholia debate corpus.";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminLayout,
});

const nav = [
  { to: "/admin", label: "Overview", exact: true },
  { to: "/admin/entries", label: "Primary entries" },
  { to: "/admin/commentaries", label: "Commentary" },
  { to: "/admin/rebuttals", label: "Rebuttals" },
  { to: "/admin/sources", label: "Source registry" },
  { to: "/admin/taxonomy", label: "Taxonomy" },
] as const;

function AdminLayout() {
  const { data } = useQuery({ queryKey: ["corpus"], queryFn: getCorpus });
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");

  const mutate = useCallback(
    async (run: () => Promise<AdminData>) => {
      const next = await run();
      queryClient.setQueryData<AdminData>(["corpus"], next);
    },
    [queryClient],
  );

  const store: AdminStore = useMemo(
    () => ({
      data: data ?? seedData(),
      mutate,
      reset: () => mutate(resetCorpus),
    }),
    [data, mutate],
  );

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (needle.length < 2) return null;
    const hit = (s: string) => s.toLowerCase().includes(needle);
    return {
      entries: data.entries.filter((e) => hit(e.title) || hit(e.originalText) || hit(e.reference)),
      commentaries: data.commentaries.filter((c) => hit(c.scholar) || hit(c.text) || hit(c.book)),
      sources: data.sources.filter((s) => hit(s.label) || hit(s.detail)),
    };
  }, [q, data]);

  return (
    <AdminContext.Provider value={store}>
      <div className="relative min-h-screen w-full overflow-hidden bg-gradient-to-b from-[oklch(0.965_0.008_255)] via-[oklch(0.945_0.012_255)] to-[oklch(0.905_0.02_258)] font-sans text-ink">
        <div className="pointer-events-none absolute -top-24 -left-24 size-[420px] rounded-full bg-[oklch(0.84_0.05_262)]/40 blur-3xl" />
        <div className="pointer-events-none absolute top-1/3 -right-32 size-[460px] rounded-full bg-[oklch(0.88_0.03_262)]/50 blur-3xl" />

        <div className="relative flex min-h-screen">
          <aside className="hidden w-60 shrink-0 flex-col border-r border-white/60 bg-white/25 px-4 py-5 backdrop-blur-xl md:flex">
            <div className="px-2">
              <div className="font-serif text-lg leading-none font-medium">Scholia</div>
              <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-mist">
                Editorial desk
              </div>
            </div>

            <nav className="mt-6 space-y-1">
              {nav.map((n) => (
                <Link
                  key={n.to}
                  to={n.to}
                  activeOptions={{ exact: "exact" in n ? n.exact : false }}
                  activeProps={{ className: "bg-ink text-paper ring-ink/15" }}
                  inactiveProps={{ className: "text-steel ring-transparent hover:bg-white/60" }}
                  className="block rounded-lg px-3 py-2 text-[13px] ring-1 transition"
                >
                  {n.label}
                </Link>
              ))}
            </nav>

            <div className="mt-auto space-y-2 px-1 pt-6">
              <Link
                to="/"
                className="block rounded-lg bg-white/60 px-3 py-2 text-center text-[12px] text-steel ring-1 ring-white/80 hover:bg-white/85"
              >
                View public reading room
              </Link>
              <button
                onClick={() => store.reset()}
                className="w-full rounded-lg px-3 py-2 text-[11px] text-mist hover:text-steel"
              >
                Reset to sample corpus
              </button>
            </div>
          </aside>

          <div className="flex min-w-0 flex-1 flex-col">
            <header className="sticky top-0 z-20 border-b border-white/60 bg-white/35 px-6 py-3 backdrop-blur-xl">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative min-w-0 flex-1">
                  <Input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search entries, scholars, references…"
                  />
                  {results && (
                    <div className="absolute top-full left-0 z-30 mt-2 max-h-80 w-full overflow-auto rounded-xl bg-white/90 p-2 ring-1 ring-white/80 shadow-lg backdrop-blur-xl">
                      {results.entries.length +
                        results.commentaries.length +
                        results.sources.length ===
                      0 ? (
                        <p className="px-2 py-3 text-[12px] text-mist">No matches.</p>
                      ) : (
                        <>
                          <ResultGroup label="Entries" to="/admin/entries">
                            {results.entries.map((e) => e.title)}
                          </ResultGroup>
                          <ResultGroup label="Commentary" to="/admin/commentaries">
                            {results.commentaries.map((c) => `${c.scholar} — ${c.book}`)}
                          </ResultGroup>
                          <ResultGroup label="Sources" to="/admin/sources">
                            {results.sources.map((s) => s.label)}
                          </ResultGroup>
                        </>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <Link
                    to="/admin/entries"
                    className="rounded-lg bg-ink px-3 py-2 text-[12px] font-medium text-paper ring-1 ring-ink/10 hover:opacity-90"
                  >
                    + New entry
                  </Link>
                  <Link
                    to="/admin/sources"
                    className="rounded-lg bg-white/60 px-3 py-2 text-[12px] font-medium text-steel ring-1 ring-white/80 hover:bg-white/85"
                  >
                    + New reference
                  </Link>
                </div>
              </div>
            </header>

            <div className="min-w-0 flex-1 px-6 py-6">
              <Outlet />
            </div>
          </div>
        </div>
      </div>
    </AdminContext.Provider>
  );
}

function ResultGroup({
  label,
  to,
  children,
}: {
  label: string;
  to: "/admin/entries" | "/admin/commentaries" | "/admin/sources";
  children: string[];
}) {
  if (children.length === 0) return null;
  return (
    <div className="mb-1">
      <div className="px-2 pt-1.5 pb-1 font-mono text-[10px] uppercase tracking-[0.16em] text-mist">
        {label}
      </div>
      {children.slice(0, 5).map((text, i) => (
        <Link
          key={`${label}-${i}`}
          to={to}
          className="block truncate rounded-md px-2 py-1.5 text-[12.5px] text-ink hover:bg-white"
        >
          {text}
        </Link>
      ))}
    </div>
  );
}
