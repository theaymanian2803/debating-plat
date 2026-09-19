import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { uid, useAdmin, type AdminSource, type SourceStatus } from "@/lib/admin-store";
import { deleteSource, upsertSource } from "@/lib/corpus-api";
import { Button, EmptyRow, Field, Input, Panel, Select } from "@/components/admin/ui";

export const Route = createFileRoute("/admin/sources")({
  head: () => ({
    meta: [
      { title: "Source registry — Scholia Admin" },
      {
        name: "description",
        content:
          "Register and verify the books, articles, manuscripts, and scholars cited across the corpus.",
      },
      { property: "og:title", content: "Source registry — Scholia Admin" },
      { property: "og:description", content: "Verify and manage cited sources in the corpus." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SourcesPage,
});

const statusNext: Record<SourceStatus, SourceStatus> = {
  verified: "pending",
  pending: "unverified",
  unverified: "verified",
};

const kindLabel: Record<AdminSource["kind"], string> = {
  book: "Book",
  article: "Article",
  manuscript: "Manuscript",
  scholar: "Scholar",
};

const statusStyle: Record<SourceStatus, string> = {
  verified: "bg-verify/10 text-verify ring-verify/25",
  pending: "bg-dispute/10 text-dispute ring-dispute/25",
  unverified: "bg-white/55 text-unv ring-unv/25",
};

const statusDot: Record<SourceStatus, string> = {
  verified: "bg-verify",
  pending: "bg-dispute",
  unverified: "bg-unv",
};

function SourcesPage() {
  const { data, mutate } = useAdmin();
  const [filter, setFilter] = useState<SourceStatus | "all">("all");
  const [kind, setKind] = useState<AdminSource["kind"] | "all">("all");
  const [editingId, setEditingId] = useState<string | null>(null);

  const blank = (): AdminSource => ({
    id: uid("src"),
    label: "",
    detail: "",
    kind: "book",
    status: "pending",
    archive: "",
  });

  const [draft, setDraft] = useState<AdminSource>(blank);
  const set = <K extends keyof AdminSource>(k: K, v: AdminSource[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const visible = useMemo(
    () =>
      data.sources.filter(
        (s) => (filter === "all" || s.status === filter) && (kind === "all" || s.kind === kind),
      ),
    [data.sources, filter, kind],
  );

  const toggle = (id: string) => {
    const s = data.sources.find((x) => x.id === id);
    if (s) mutate(() => upsertSource({ data: { ...s, status: statusNext[s.status] } }));
  };

  const save = () => {
    if (!draft.label.trim()) return;
    mutate(() => upsertSource({ data: draft }));
    setDraft(blank());
    setEditingId(null);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <Panel
        title={editingId ? "Edit source" : "Register a source"}
        subtitle="Books, articles, manuscripts, and scholars"
        action={
          editingId ? (
            <Button
              variant="ghost"
              onClick={() => {
                setDraft(blank());
                setEditingId(null);
              }}
            >
              Cancel
            </Button>
          ) : null
        }
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Source label">
              <Input
                value={draft.label}
                onChange={(e) => set("label", e.target.value)}
                placeholder="e.g. Discourses IV.1 (Loeb)"
              />
            </Field>
            <Field label="Kind">
              <Select
                value={draft.kind}
                onChange={(e) => set("kind", e.target.value as AdminSource["kind"])}
              >
                {Object.entries(kindLabel).map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Detail">
              <Input
                value={draft.detail}
                onChange={(e) => set("detail", e.target.value)}
                placeholder="e.g. Oldfather, trans., Harvard UP, 1925"
              />
            </Field>
            <Field label="Archive / repository">
              <Input
                value={draft.archive}
                onChange={(e) => set("archive", e.target.value)}
                placeholder="e.g. Perseus, Sefaria, JSTOR"
              />
            </Field>
          </div>
          <Button onClick={save}>{editingId ? "Save changes" : "Add source"}</Button>
        </div>
      </Panel>

      <Panel
        title="Source & citation registry"
        subtitle={`${visible.length} shown of ${data.sources.length}`}
      >
        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          <Select
            value={filter}
            onChange={(e) => setFilter(e.target.value as SourceStatus | "all")}
          >
            <option value="all">All statuses</option>
            <option value="verified">Verified</option>
            <option value="pending">Pending</option>
            <option value="unverified">Unverified</option>
          </Select>
          <Select
            value={kind}
            onChange={(e) => setKind(e.target.value as AdminSource["kind"] | "all")}
          >
            <option value="all">All kinds</option>
            {Object.entries(kindLabel).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </Select>
        </div>

        {visible.length === 0 ? (
          <EmptyRow>No sources match these filters.</EmptyRow>
        ) : (
          <ul className="space-y-2">
            {visible.map((s) => (
              <li
                key={s.id}
                className="flex items-start justify-between gap-3 rounded-xl bg-white/55 px-3.5 py-3 ring-1 ring-white/75"
              >
                <div className="min-w-0">
                  <div className="truncate font-serif text-[14px]">{s.label}</div>
                  <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-mist">
                    {kindLabel[s.kind]}
                    {s.archive ? ` · ${s.archive}` : ""}
                  </div>
                  {s.detail && <p className="mt-1.5 text-[12px] text-steel">{s.detail}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => toggle(s.id)}
                    title="Click to cycle verification status"
                    className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-mono text-[10px] ring-1 transition hover:opacity-80 ${statusStyle[s.status]}`}
                  >
                    <span className={`size-1.5 shrink-0 rounded-full ${statusDot[s.status]}`} />
                    {s.status}
                  </button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setDraft(s);
                      setEditingId(s.id);
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => mutate(() => deleteSource({ data: s.id }))}
                  >
                    Delete
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
