import { createFileRoute, Link } from "@tanstack/react-router";
import { useAdmin } from "@/lib/admin-store";
import { Panel, Stat } from "@/components/admin/ui";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Dashboard overview — Scholia Admin" },
      {
        name: "description",
        content:
          "Corpus totals, recent editorial activity, and quick actions for the Scholia debate corpus.",
      },
      { property: "og:title", content: "Dashboard overview — Scholia Admin" },
      {
        property: "og:description",
        content: "Corpus totals and quick actions for the Scholia debate corpus.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Overview,
});

function Overview() {
  const { data } = useAdmin();
  const verses = data.entries.filter((e) => e.kind === "verse").length;
  const premises = data.entries.length - verses;
  const pending = data.sources.filter((s) => s.status !== "verified").length;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="font-serif text-2xl leading-tight font-medium">Editorial overview</h1>
        <p className="mt-1 text-[13px] text-mist">
          Everything in the corpus at a glance. Changes you make here are saved in this browser.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Primary entries"
          value={data.entries.length}
          note={`${verses} verses · ${premises} premises`}
        />
        <Stat label="Commentaries" value={data.commentaries.length} note="Across all scholars" />
        <Stat label="Rebuttals" value={data.rebuttals.length} note="Counter-arguments on file" />
        <Stat
          label="Cited sources"
          value={data.sources.length}
          note={`${pending} awaiting verification`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Panel title="Recent primary entries" subtitle="Newest first">
          <ul className="space-y-2">
            {data.entries
              .slice()
              .reverse()
              .slice(0, 5)
              .map((e) => (
                <li key={e.id} className="rounded-lg bg-white/55 px-3 py-2.5 ring-1 ring-white/75">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="truncate font-serif text-[14px] text-ink">{e.title}</span>
                    <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] text-mist">
                      {e.category}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-[12px] text-mist">{e.reference}</p>
                </li>
              ))}
          </ul>
        </Panel>

        <Panel title="Quick actions">
          <div className="grid gap-2">
            <Link
              to="/admin/entries"
              className="rounded-lg bg-ink px-3 py-2.5 text-center text-[12.5px] font-medium text-paper hover:opacity-90"
            >
              Add a verse or premise
            </Link>
            <Link
              to="/admin/commentaries"
              className="rounded-lg bg-white/60 px-3 py-2.5 text-center text-[12.5px] text-steel ring-1 ring-white/80 hover:bg-white/85"
            >
              Attach a commentary
            </Link>
            <Link
              to="/admin/rebuttals"
              className="rounded-lg bg-white/60 px-3 py-2.5 text-center text-[12.5px] text-steel ring-1 ring-white/80 hover:bg-white/85"
            >
              Record a rebuttal
            </Link>
            <Link
              to="/admin/sources"
              className="rounded-lg bg-white/60 px-3 py-2.5 text-center text-[12.5px] text-steel ring-1 ring-white/80 hover:bg-white/85"
            >
              Register a source
            </Link>
            <Link
              to="/admin/taxonomy"
              className="rounded-lg bg-white/60 px-3 py-2.5 text-center text-[12.5px] text-steel ring-1 ring-white/80 hover:bg-white/85"
            >
              Organise categories & tags
            </Link>
          </div>
        </Panel>
      </div>
    </div>
  );
}
