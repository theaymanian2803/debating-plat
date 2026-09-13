import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { uid, useAdmin, type AdminCategory } from "@/lib/admin-store";
import {
  addSubCategory,
  deleteCategory,
  deleteTag,
  removeSubCategory,
  renameCategory as renameCategoryServer,
  upsertCategory,
  upsertTag,
} from "@/lib/corpus-api";
import { Button, EmptyRow, Field, Input, Panel } from "@/components/admin/ui";

export const Route = createFileRoute("/admin/taxonomy")({
  head: () => ({
    meta: [
      { title: "Taxonomy — Scholia Admin" },
      {
        name: "description",
        content:
          "Organise the categories, sub-categories, and tags that structure the Scholia debate corpus.",
      },
      { property: "og:title", content: "Taxonomy — Scholia Admin" },
      { property: "og:description", content: "Manage categories and tags in the Scholia corpus." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TaxonomyPage,
});

function TaxonomyPage() {
  const { data, mutate } = useAdmin();
  const [newCat, setNewCat] = useState("");
  const [renaming, setRenaming] = useState<Record<string, string>>({});
  const [newSub, setNewSub] = useState<Record<string, string>>({});
  const [newTag, setNewTag] = useState("");

  const dropKey = (id: string, map: Record<string, string>) => {
    const rest: Record<string, string> = {};
    for (const [k, v] of Object.entries(map)) if (k !== id) rest[k] = v;
    return rest;
  };

  const addCategory = () => {
    const label = newCat.trim();
    if (!label) return;
    mutate(() => upsertCategory({ id: uid("cat"), label, subs: [] }));
    setNewCat("");
  };

  const renameCategory = (id: string) => {
    const label = renaming[id]?.trim();
    if (!label) return;
    mutate(() => renameCategoryServer(id, label));
    setRenaming((r) => dropKey(id, r));
  };

  const removeCategory = (id: string) => {
    mutate(() => deleteCategory(id));
  };

  const addSub = (cat: AdminCategory) => {
    const sub = newSub[cat.id]?.trim();
    if (!sub) return;
    mutate(() => addSubCategory(cat.id, sub));
    setNewSub((s) => ({ ...s, [cat.id]: "" }));
  };

  const removeSub = (cat: AdminCategory, sub: string) => {
    mutate(() => removeSubCategory(cat.id, sub));
  };

  const addTag = () => {
    const tag = newTag.trim();
    if (!tag) return;
    mutate(() => upsertTag({ id: tag, label: tag }));
    setNewTag("");
  };

  const removeTag = (tag: string) => {
    mutate(() => deleteTag(tag));
  };

  const tagCount = (tag: string) => data.entries.filter((e) => e.tags.includes(tag)).length;
  const entryCount = (label: string) => data.entries.filter((e) => e.category === label).length;

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <Panel title="Categories" subtitle={`${data.categories.length} top-level categories`}>
        <div className="mb-4 flex gap-2">
          <Input
            value={newCat}
            onChange={(e) => setNewCat(e.target.value)}
            placeholder="New category name"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCategory();
              }
            }}
          />
          <Button onClick={addCategory}>Add category</Button>
        </div>

        {data.categories.length === 0 ? (
          <EmptyRow>No categories yet.</EmptyRow>
        ) : (
          <ul className="space-y-2">
            {data.categories.map((c) => (
              <li key={c.id} className="rounded-xl bg-white/55 px-3.5 py-3 ring-1 ring-white/75">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                    <span className="font-serif text-[14px]">{c.label}</span>
                    <span className="font-mono text-[10px] text-mist">
                      {entryCount(c.label)} entries
                    </span>
                    {renaming[c.id] !== undefined && (
                      <>
                        <Input
                          autoFocus
                          value={renaming[c.id] ?? ""}
                          onChange={(e) => setRenaming((r) => ({ ...r, [c.id]: e.target.value }))}
                          className="w-44"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              renameCategory(c.id);
                            }
                            if (e.key === "Escape") setRenaming((r) => dropKey(c.id, r));
                          }}
                        />
                        <Button onClick={() => renameCategory(c.id)}>Save</Button>
                      </>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    {renaming[c.id] === undefined && (
                      <Button
                        variant="ghost"
                        onClick={() => setRenaming((r) => ({ ...r, [c.id]: c.label }))}
                      >
                        Rename
                      </Button>
                    )}
                    <Button variant="danger" onClick={() => removeCategory(c.id)}>
                      Delete
                    </Button>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  {c.subs.map((s) => (
                    <span
                      key={s}
                      className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-2.5 py-1 font-mono text-[10px] text-steel ring-1 ring-white/80"
                    >
                      {s}
                      <button
                        type="button"
                        onClick={() => removeSub(c, s)}
                        className="text-mist hover:text-destructive"
                        title={`Remove "${s}"`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  <div className="flex items-center gap-1.5">
                    <Input
                      value={newSub[c.id] ?? ""}
                      onChange={(e) => setNewSub((s) => ({ ...s, [c.id]: e.target.value }))}
                      placeholder="+ sub-category"
                      className="w-36 px-2 py-1 text-[11px]"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addSub(c);
                        }
                      }}
                    />
                    <Button variant="ghost" onClick={() => addSub(c)}>
                      Add
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Tags" subtitle={`${data.tags.length} tags across the corpus`}>
        <Field label="Add a tag">
          <div className="flex gap-2">
            <Input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder="e.g. free will"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTag();
                }
              }}
            />
            <Button onClick={addTag}>Add tag</Button>
          </div>
        </Field>

        {data.tags.length === 0 ? (
          <div className="mt-4">
            <EmptyRow>No tags yet.</EmptyRow>
          </div>
        ) : (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {data.tags.map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-2.5 py-1 font-mono text-[10px] text-steel ring-1 ring-white/80"
              >
                {t}
                <span className="text-mist">{tagCount(t)}</span>
                <button
                  type="button"
                  onClick={() => removeTag(t)}
                  className="text-mist hover:text-destructive"
                  title={`Remove "${t}"`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
