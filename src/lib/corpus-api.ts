import { createServerFn } from "@tanstack/react-start";
import type {
  AdminCategory,
  AdminCommentary,
  AdminEntry,
  AdminRebuttal,
  AdminSource,
} from "@/lib/admin-store";
import * as core from "@/server/corpus-core";

export const getCorpus = createServerFn({ method: "POST" }).handler(core.getCorpusData);

export const upsertEntry = createServerFn({ method: "POST" })
  .validator((entry: AdminEntry) => entry)
  .handler(({ data }) => core.upsertEntry(data));

export const deleteEntry = createServerFn({ method: "POST" })
  .validator((id: string) => id)
  .handler(({ data }) => core.deleteEntry(data));

export const upsertCommentary = createServerFn({ method: "POST" })
  .validator((c: AdminCommentary) => c)
  .handler(({ data }) => core.upsertCommentary(data));

export const deleteCommentary = createServerFn({ method: "POST" })
  .validator((id: string) => id)
  .handler(({ data }) => core.deleteCommentary(data));

export const upsertRebuttal = createServerFn({ method: "POST" })
  .validator((r: AdminRebuttal) => r)
  .handler(({ data }) => core.upsertRebuttal(data));

export const deleteRebuttal = createServerFn({ method: "POST" })
  .validator((id: string) => id)
  .handler(({ data }) => core.deleteRebuttal(data));

export const upsertSource = createServerFn({ method: "POST" })
  .validator((s: AdminSource) => s)
  .handler(({ data }) => core.upsertSource(data));

export const deleteSource = createServerFn({ method: "POST" })
  .validator((id: string) => id)
  .handler(({ data }) => core.deleteSource(data));

export const upsertCategory = createServerFn({ method: "POST" })
  .validator((c: AdminCategory) => c)
  .handler(({ data }) => core.upsertCategory(data));

export const deleteCategory = createServerFn({ method: "POST" })
  .validator((id: string) => id)
  .handler(({ data }) => core.deleteCategory(data));

export const renameCategory = createServerFn({ method: "POST" })
  .validator((input: { id: string; label: string }) => input)
  .handler(({ data }) => core.renameCategory(data.id, data.label));

export const addSubCategory = createServerFn({ method: "POST" })
  .validator((input: { id: string; sub: string }) => input)
  .handler(({ data }) => core.addSubCategory(data.id, data.sub));

export const removeSubCategory = createServerFn({ method: "POST" })
  .validator((input: { id: string; sub: string }) => input)
  .handler(({ data }) => core.removeSubCategory(data.id, data.sub));

export const upsertTag = createServerFn({ method: "POST" })
  .validator((t: { id: string; label: string }) => t)
  .handler(({ data }) => core.upsertTag(data));

export const deleteTag = createServerFn({ method: "POST" })
  .validator((label: string) => label)
  .handler(({ data }) => core.deleteTag(data));

export const resetCorpus = createServerFn({ method: "POST" }).handler(core.resetCorpusData);
