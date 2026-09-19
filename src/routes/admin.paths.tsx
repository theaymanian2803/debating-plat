import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { deletePath, listPaths, upsertPath } from "@/lib/corpus-api";
import { useAdmin } from "@/lib/admin-store";
import { uid } from "@/lib/admin-store";
import { Button, EmptyRow, Field, Input, Panel, Textarea } from "@/components/admin/ui";

export const Route = createFileRoute("/admin/paths")({
  head: () => ({
    meta: [
      { title: "Reading paths — Scholia Admin" },
      {
        name: "description",
        content: "Curate ordered sequences through the corpus for guided reading.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PathsPage,
});

type Draft = { id: string; title: string; description: string; entryIds: string[] };

const blank = (): Draft => ({ id: uid("path"), title: "", description: "", entryIds: [] });

function PathsPage() {
  const queryClient = useQueryClient();
  const { data: admin } = useAdmin();
  const [draft, setDraft] = useState<Draft>(blank);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data } = useQuery({ queryKey: ["paths"], queryFn: listPaths });
  const paths = data ?? [];

  const byId = new Map(admin.entries.map((e) => [e.id, e.title]));

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["paths"] });
  };

  const save = () => {
    if (!draft.title.trim()) return;
    upsertPath({ data: draft }).then(() => {
      refresh();
      setDraft(blank());
      setEditingId(null);
    });
  };

  const toggleEntry = (id: string) => {
    setDraft((d) => ({
      ...d,
      entryIds: d.entryIds.includes(id) ? d.entryIds.filter((x) => x !== id) : [...d.entryIds, id],
    }));
  };

  const move = (index: number, dir: -1 | 1) => {
    setDraft((d) => {
      const next = [...d.entryIds];
      const j = index + dir;
      if (j < 0 || j >= next.length) return d;
      [next[index], next[j]] = [next[j]!, next[index]!];
      return { ...d, entryIds: next };
    });
  };

  const remove = (id: string) => {
    deletePath({ data: id }).then(refresh);
  };

  return (
    <div className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-[1fr_1fr]">
      <Panel
        title={editingId ? "Edit reading path" : "New reading path"}
        subtitle="An ordered sequence through the corpus"
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
          <Field label="Path title">
            <Input
              value={draft.title}
              onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
              placeholder="e.g. The Stoic reading of freedom"
            />
          </Field>
          <Field label="Description">
            <Textarea
              rows={2}
              value={draft.description}
              onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
            />
          </Field>
          <Field label="Entries in order" hint="Click to add or remove. Order is click order.">
            <div className="flex flex-wrap gap-1.5">
              {admin.entries.map((e) => {
                const on = draft.entryIds.includes(e.id);
                return (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => toggleEntry(e.id)}
                    className={`rounded-full px-2.5 py-1 font-mono text-[10px] ring-1 transition ${
                      on
                        ? "bg-ink text-paper ring-ink/20"
                        : "bg-white/60 text-steel ring-white/80 hover:bg-white/85"
                    }`}
                  >
                    {e.title}
                  </button>
                );
              })}
            </div>
            {draft.entryIds.length > 0 && (
              <ol className="mt-3 space-y-1.5">
                {draft.entryIds.map((id, i) => (
                  <li
                    key={id}
                    className="flex items-center gap-2 rounded-lg bg-white/45 px-3 py-2 ring-1 ring-white/70"
                  >
                    <span className="font-mono text-[10px] text-mist">{i + 1}</span>
                    <span className="min-w-0 flex-1 truncate text-[12.5px] text-ink">
                      {byId.get(id) ?? id}
                    </span>
                    <button
                      type="button"
                      onClick={() => move(i, -1)}
                      disabled={i === 0}
                      className="rounded px-1.5 py-0.5 font-mono text-[11px] text-mist hover:bg-white/60 disabled:opacity-30"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => move(i, 1)}
                      disabled={i === draft.entryIds.length - 1}
                      className="rounded px-1.5 py-0.5 font-mono text-[11px] text-mist hover:bg-white/60 disabled:opacity-30"
                    >
                      ↓
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </Field>
          <Button onClick={save}>{editingId ? "Save changes" : "Create path"}</Button>
        </div>
      </Panel>

      <Panel title="Reading paths" subtitle={`${paths.length} on file`}>
        {paths.length === 0 ? (
          <EmptyRow>No reading paths yet.</EmptyRow>
        ) : (
          <ul className="space-y-2">
            {paths.map((p) => (
              <li key={p.id} className="rounded-xl bg-white/55 px-3.5 py-3 ring-1 ring-white/75">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-serif text-[14px] text-ink">{p.title}</div>
                    {p.description && (
                      <p className="mt-0.5 text-[12px] leading-relaxed text-mist">
                        {p.description}
                      </p>
                    )}
                    <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-mist">
                      {p.entryIds.length} entries
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setDraft({ ...p, entryIds: [...p.entryIds] });
                        setEditingId(p.id);
                      }}
                    >
                      Edit
                    </Button>
                    <Button variant="danger" onClick={() => remove(p.id)}>
                      Delete
                    </Button>
                  </div>
                </div>
                {p.entryIds.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {p.entryIds.map((id, i) => (
                      <span
                        key={id}
                        className="rounded-full bg-white/70 px-2 py-0.5 font-mono text-[10px] text-steel ring-1 ring-white/80"
                      >
                        {i + 1}. {byId.get(id) ?? id}
                      </span>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
