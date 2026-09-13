import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { uid, useAdmin, type AdminEntry } from "@/lib/admin-store";
import { deleteEntry, upsertEntry, upsertTag } from "@/lib/corpus-api";
import {
  Button,
  EmptyRow,
  Field,
  Input,
  Panel,
  Select,
  TagPicker,
  Textarea,
} from "@/components/admin/ui";

export const Route = createFileRoute("/admin/entries")({
  head: () => ({
    meta: [
      { title: "Primary entries — Scholia Admin" },
      {
        name: "description",
        content:
          "Add and edit sacred-text verses and philosophical premises with original text, translation, category, and cross-reference tags.",
      },
      { property: "og:title", content: "Primary entries — Scholia Admin" },
      {
        property: "og:description",
        content: "Add and edit verses and premises in the Scholia corpus.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: EntriesPage,
});

const blank = (): AdminEntry => ({
  id: uid("entry"),
  kind: "verse",
  title: "",
  originalText: "",
  translation: "",
  category: "Religion",
  subCategory: "",
  reference: "",
  tags: [],
  sections: [],
  map: { nodes: [], edges: [] },
});

function EntriesPage() {
  const { data, mutate } = useAdmin();
  const [draft, setDraft] = useState<AdminEntry>(blank);
  const [editingId, setEditingId] = useState<string | null>(null);

  const set = <K extends keyof AdminEntry>(key: K, value: AdminEntry[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const category = data.categories.find((c) => c.label === draft.category);

  const save = () => {
    if (!draft.title.trim()) return;
    mutate(() => upsertEntry(draft));
    setDraft(blank());
    setEditingId(null);
  };

  return (
    <div className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-[1fr_1fr]">
      <Panel
        title={editingId ? "Edit primary entry" : "New primary entry"}
        subtitle="Verses and philosophical premises"
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
            <Field label="Type">
              <Select
                value={draft.kind}
                onChange={(e) => set("kind", e.target.value as AdminEntry["kind"])}
              >
                <option value="verse">Verse</option>
                <option value="premise">Premise</option>
              </Select>
            </Field>
            <Field label="Chapter / section reference">
              <Input
                value={draft.reference}
                onChange={(e) => set("reference", e.target.value)}
                placeholder="e.g. Discourses IV.1"
              />
            </Field>
          </div>

          <Field label="Entry title">
            <Input
              value={draft.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="Epictetus — Discourses IV.1"
            />
          </Field>

          <Field label="Original text">
            <Textarea
              rows={4}
              value={draft.originalText}
              onChange={(e) => set("originalText", e.target.value)}
            />
          </Field>

          <Field label="Official translation">
            <Textarea
              rows={3}
              value={draft.translation}
              onChange={(e) => set("translation", e.target.value)}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Category">
              <Select value={draft.category} onChange={(e) => set("category", e.target.value)}>
                {data.categories.map((c) => (
                  <option key={c.id} value={c.label}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Sub-category">
              <Select
                value={draft.subCategory}
                onChange={(e) => set("subCategory", e.target.value)}
              >
                <option value="">—</option>
                {(category?.subs ?? []).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="Related topics & cross-references" hint="Select any number of tags.">
            <TagPicker
              options={data.tags}
              value={draft.tags}
              onChange={(tags) => set("tags", tags)}
              onCreate={(tag) => mutate(() => upsertTag({ id: tag, label: tag }))}
            />
          </Field>

          <Button onClick={save}>{editingId ? "Save changes" : "Add entry"}</Button>
        </div>
      </Panel>

      <Panel title="Corpus entries" subtitle={`${data.entries.length} on file`}>
        <ul className="space-y-2">
          {data.entries.length === 0 && <EmptyRow>No entries yet.</EmptyRow>}
          {data.entries.map((e) => (
            <li key={e.id} className="rounded-xl bg-white/55 px-3.5 py-3 ring-1 ring-white/75">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate font-serif text-[14px] text-ink">{e.title}</div>
                  <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-mist">
                    {e.kind} · {e.category}
                    {e.subCategory ? ` / ${e.subCategory}` : ""}
                  </div>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setDraft(e);
                      setEditingId(e.id);
                    }}
                  >
                    Edit
                  </Button>
                  <Button variant="danger" onClick={() => mutate(() => deleteEntry(e.id))}>
                    Delete
                  </Button>
                </div>
              </div>
              <p className="mt-2 line-clamp-2 text-[12.5px] leading-relaxed text-steel">
                {e.originalText}
              </p>
              {e.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {e.tags.map((t) => (
                    <span
                      key={t}
                      className="rounded-full bg-white/70 px-2 py-0.5 font-mono text-[10px] text-steel ring-1 ring-white/80"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
