import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { uid, useAdmin, type AdminCommentary } from "@/lib/admin-store";
import { deleteCommentary, upsertCommentary } from "@/lib/corpus-api";
import type { Verification } from "@/lib/corpus";
import { StatusBadge } from "@/components/StatusBadge";
import { Button, EmptyRow, Field, Input, Panel, Select, Textarea } from "@/components/admin/ui";

export const Route = createFileRoute("/admin/commentaries")({
  head: () => ({
    meta: [
      { title: "Commentary & references — Scholia Admin" },
      {
        name: "description",
        content:
          "Attach scholarly commentaries to a primary entry with author, book, volume and page, and publication reference.",
      },
      { property: "og:title", content: "Commentary & references — Scholia Admin" },
      {
        property: "og:description",
        content: "Attach scholarly commentaries and references to corpus entries.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CommentaryPage,
});

function CommentaryPage() {
  const { data, mutate } = useAdmin();
  const [entryId, setEntryId] = useState(data.entries[0]?.id ?? "");
  const [editingId, setEditingId] = useState<string | null>(null);

  const blank = (): AdminCommentary => ({
    id: uid("com"),
    entryId,
    scholar: "",
    text: "",
    book: "",
    volumePage: "",
    sourceRef: "",
    status: "unverified",
    seeded: false,
  });

  const [draft, setDraft] = useState<AdminCommentary>(blank);
  const set = <K extends keyof AdminCommentary>(k: K, v: AdminCommentary[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const attached = data.commentaries.filter((c) => c.entryId === entryId);
  const entry = data.entries.find((e) => e.id === entryId);

  const save = () => {
    if (!draft.scholar.trim()) return;
    mutate(() => upsertCommentary({ data: { ...draft, entryId } }));
    setDraft(blank());
    setEditingId(null);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <Panel title="Primary entry" subtitle="Commentaries below are attached to this entry">
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
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          title={editingId ? "Edit commentary" : "New commentary"}
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
            <Field label="Scholar / author">
              <Input
                value={draft.scholar}
                onChange={(e) => set("scholar", e.target.value)}
                placeholder="e.g. Rashi, A. A. Long"
              />
            </Field>
            <Field label="Commentary text">
              <Textarea rows={5} value={draft.text} onChange={(e) => set("text", e.target.value)} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Book title">
                <Input value={draft.book} onChange={(e) => set("book", e.target.value)} />
              </Field>
              <Field label="Volume / page">
                <Input
                  value={draft.volumePage}
                  onChange={(e) => set("volumePage", e.target.value)}
                  placeholder="vol. II, pp. 118–124"
                />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Publication / source reference">
                <Input
                  value={draft.sourceRef}
                  onChange={(e) => set("sourceRef", e.target.value)}
                  placeholder="JSTOR, Sefaria, Teubner…"
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
            <Button onClick={save}>{editingId ? "Save changes" : "Attach commentary"}</Button>
          </div>
        </Panel>

        <Panel title="Attached commentaries" subtitle={`${attached.length} on this entry`}>
          <ul className="space-y-2">
            {attached.length === 0 && <EmptyRow>No commentary attached yet.</EmptyRow>}
            {attached.map((c) => (
              <li key={c.id} className="rounded-xl bg-white/55 px-3.5 py-3 ring-1 ring-white/75">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-serif text-[14px]">{c.scholar}</div>
                    <div className="mt-0.5 truncate text-[11.5px] text-mist">
                      {c.book}
                      {c.volumePage ? ` · ${c.volumePage}` : ""}
                    </div>
                  </div>
                  <StatusBadge status={c.status} />
                </div>
                <p className="mt-2 line-clamp-3 text-[12.5px] leading-relaxed text-steel">
                  {c.text}
                </p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="font-mono text-[10px] text-mist">{c.sourceRef}</span>
                  <div className="flex gap-1.5">
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setDraft(c);
                        setEditingId(c.id);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => mutate(() => deleteCommentary({ data: c.id }))}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
