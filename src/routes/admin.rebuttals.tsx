import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { uid, useAdmin, type AdminRebuttal } from "@/lib/admin-store";
import { deleteRebuttal, upsertRebuttal } from "@/lib/corpus-api";
import type { Verification } from "@/lib/corpus";
import { StatusBadge } from "@/components/StatusBadge";
import { Button, EmptyRow, Field, Input, Panel, Select, Textarea } from "@/components/admin/ui";

export const Route = createFileRoute("/admin/rebuttals")({
  head: () => ({
    meta: [
      { title: "Rebuttals — Scholia Admin" },
      {
        name: "description",
        content:
          "Record counter-arguments and rebuttals against primary entries with a side-by-side preview of the source text.",
      },
      { property: "og:title", content: "Rebuttals — Scholia Admin" },
      {
        property: "og:description",
        content: "Record and review rebuttals in the Scholia corpus.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RebuttalsPage,
});

function RebuttalsPage() {
  const { data, mutate } = useAdmin();
  const [entryId, setEntryId] = useState(data.entries[0]?.id ?? "");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);

  const blank = (): AdminRebuttal => ({
    id: uid("reb"),
    entryId,
    opponent: "",
    stance: "",
    text: "",
    counterRefs: "",
    status: "unverified",
    citations: [],
  });

  const [draft, setDraft] = useState<AdminRebuttal>(blank);
  const set = <K extends keyof AdminRebuttal>(k: K, v: AdminRebuttal[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const attached = data.rebuttals.filter((r) => r.entryId === entryId);
  const entry = data.entries.find((e) => e.id === entryId);
  const preview = attached.find((r) => r.id === previewId) ?? attached[0] ?? null;

  const save = () => {
    if (!draft.opponent.trim() || !draft.text.trim()) return;
    mutate(() => upsertRebuttal({ ...draft, entryId }));
    setDraft(blank());
    setEditingId(null);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <Panel title="Primary entry" subtitle="Rebuttals below are attached to this entry">
        <Select value={entryId} onChange={(e) => setEntryId(e.target.value)}>
          {data.entries.map((e) => (
            <option key={e.id} value={e.id}>
              {e.title}
            </option>
          ))}
        </Select>
        {entry && (
          <p className="mt-3 font-serif text-[14px] leading-relaxed text-steel">
            {entry.originalText}
          </p>
        )}
        {entry?.translation && (
          <p className="mt-2 text-[12.5px] leading-relaxed text-mist">{entry.translation}</p>
        )}
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Side-by-side preview" {...(entry ? { subtitle: entry.title } : {})}>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-mist">
                Primary text
              </div>
              <p className="mt-2 font-serif text-[13.5px] leading-relaxed text-ink">
                {entry?.originalText ?? "Select an entry above."}
              </p>
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-mist">
                Rebuttal
              </div>
              {preview ? (
                <>
                  <div className="mt-2 flex items-start justify-between gap-2">
                    <span className="font-serif text-[13.5px] leading-tight text-ink">
                      {preview.opponent}
                      {preview.stance ? ` — ${preview.stance}` : ""}
                    </span>
                    <StatusBadge status={preview.status} />
                  </div>
                  <p className="mt-2 text-[12.5px] leading-relaxed text-steel">{preview.text}</p>
                  {preview.counterRefs && (
                    <div className="mt-2 font-mono text-[10px] text-mist">
                      {preview.counterRefs}
                    </div>
                  )}
                </>
              ) : (
                <p className="mt-2 text-[12.5px] text-mist">No rebuttal to preview.</p>
              )}
            </div>
          </div>
        </Panel>

        <Panel title="Rebuttals on this entry" subtitle={`${attached.length} on file`}>
          <ul className="space-y-2">
            {attached.length === 0 && <EmptyRow>No rebuttals recorded yet.</EmptyRow>}
            {attached.map((r) => (
              <li key={r.id} className="rounded-xl bg-white/55 px-3.5 py-3 ring-1 ring-white/75">
                <div className="flex items-start justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setPreviewId(r.id)}
                    className="min-w-0 text-left"
                  >
                    <div className="truncate font-serif text-[14px]">{r.opponent}</div>
                    <div className="mt-0.5 truncate text-[11.5px] text-mist">{r.stance}</div>
                  </button>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <StatusBadge status={r.status} />
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setDraft(r);
                        setEditingId(r.id);
                      }}
                    >
                      Edit
                    </Button>
                    <Button variant="danger" onClick={() => mutate(() => deleteRebuttal(r.id))}>
                      Delete
                    </Button>
                  </div>
                </div>
                <p className="mt-2 line-clamp-3 text-[12.5px] leading-relaxed text-steel">
                  {r.text}
                </p>
                {r.counterRefs && (
                  <div className="mt-2 font-mono text-[10px] text-mist">{r.counterRefs}</div>
                )}
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <Panel
        title={editingId ? "Edit rebuttal" : "New rebuttal"}
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
            <Field label="Opponent / author">
              <Input
                value={draft.opponent}
                onChange={(e) => set("opponent", e.target.value)}
                placeholder="e.g. Celsus, Sextus Empiricus"
              />
            </Field>
            <Field label="Stance / perspective">
              <Input
                value={draft.stance}
                onChange={(e) => set("stance", e.target.value)}
                placeholder="e.g. Epicurean, Divine command"
              />
            </Field>
          </div>

          <Field label="Rebuttal text">
            <Textarea rows={5} value={draft.text} onChange={(e) => set("text", e.target.value)} />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Counter references" hint="Sources the rebuttal leans on.">
              <Input
                value={draft.counterRefs}
                onChange={(e) => set("counterRefs", e.target.value)}
                placeholder="e.g. De Natura Deorum II.12"
              />
            </Field>
            <Field label="Verification">
              <Select
                value={draft.status}
                onChange={(e) => set("status", e.target.value as Verification)}
              >
                <option value="verified">Verified</option>
                <option value="disputed">Disputed</option>
                <option value="unverified">Unverified</option>
              </Select>
            </Field>
          </div>

          <Button onClick={save}>{editingId ? "Save changes" : "Record rebuttal"}</Button>
        </div>
      </Panel>
    </div>
  );
}
