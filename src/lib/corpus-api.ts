import { createServerFn } from "@tanstack/react-start";
import { setResponseStatus } from "@tanstack/react-start/server";
import type {
  AdminCategory,
  AdminCommentary,
  AdminEntry,
  AdminRebuttal,
  AdminSource,
} from "@/lib/admin-store";
import { AdminAuthError, requireAdmin } from "@/server/auth";
import * as core from "@/server/corpus-core";

const guard = () => {
  try {
    requireAdmin();
  } catch (error) {
    if (error instanceof AdminAuthError) {
      setResponseStatus(error.status);
      throw new Error("Unauthorized");
    }
    throw error;
  }
};

export const getCorpus = createServerFn({ method: "POST" }).handler(core.getCorpusData);

export const upsertEntry = createServerFn({ method: "POST" })
  .validator((entry: AdminEntry) => entry)
  .handler(({ data }) => {
    guard();
    return core.upsertEntry(data);
  });

export const deleteEntry = createServerFn({ method: "POST" })
  .validator((id: string) => id)
  .handler(({ data }) => {
    guard();
    return core.deleteEntry(data);
  });

export const upsertCommentary = createServerFn({ method: "POST" })
  .validator((c: AdminCommentary) => c)
  .handler(({ data }) => {
    guard();
    return core.upsertCommentary(data);
  });

export const deleteCommentary = createServerFn({ method: "POST" })
  .validator((id: string) => id)
  .handler(({ data }) => {
    guard();
    return core.deleteCommentary(data);
  });

export const upsertRebuttal = createServerFn({ method: "POST" })
  .validator((r: AdminRebuttal) => r)
  .handler(({ data }) => {
    guard();
    return core.upsertRebuttal(data);
  });

export const deleteRebuttal = createServerFn({ method: "POST" })
  .validator((id: string) => id)
  .handler(({ data }) => {
    guard();
    return core.deleteRebuttal(data);
  });

export const upsertSource = createServerFn({ method: "POST" })
  .validator((s: AdminSource) => s)
  .handler(({ data }) => {
    guard();
    return core.upsertSource(data);
  });

export const deleteSource = createServerFn({ method: "POST" })
  .validator((id: string) => id)
  .handler(({ data }) => {
    guard();
    return core.deleteSource(data);
  });

export const upsertCategory = createServerFn({ method: "POST" })
  .validator((c: AdminCategory) => c)
  .handler(({ data }) => {
    guard();
    return core.upsertCategory(data);
  });

export const deleteCategory = createServerFn({ method: "POST" })
  .validator((id: string) => id)
  .handler(({ data }) => {
    guard();
    return core.deleteCategory(data);
  });

export const renameCategory = createServerFn({ method: "POST" })
  .validator((input: { id: string; label: string }) => input)
  .handler(({ data }) => {
    guard();
    return core.renameCategory(data.id, data.label);
  });

export const addSubCategory = createServerFn({ method: "POST" })
  .validator((input: { id: string; sub: string }) => input)
  .handler(({ data }) => {
    guard();
    return core.addSubCategory(data.id, data.sub);
  });

export const removeSubCategory = createServerFn({ method: "POST" })
  .validator((input: { id: string; sub: string }) => input)
  .handler(({ data }) => {
    guard();
    return core.removeSubCategory(data.id, data.sub);
  });

export const upsertTag = createServerFn({ method: "POST" })
  .validator((t: { id: string; label: string }) => t)
  .handler(({ data }) => {
    guard();
    return core.upsertTag(data);
  });

export const deleteTag = createServerFn({ method: "POST" })
  .validator((label: string) => label)
  .handler(({ data }) => {
    guard();
    return core.deleteTag(data);
  });

export const resetCorpus = createServerFn({ method: "POST" }).handler(() => {
  guard();
  return core.resetCorpusData();
});

export const listSourceRequests = createServerFn({ method: "POST" })
  .validator((status: "pending" | "approved" | "dismissed" | "all") => status)
  .handler(({ data }) => {
    guard();
    return core.listSourceRequests(data);
  });

export const createSourceRequest = createServerFn({ method: "POST" })
  .validator((input: core.SourceRequestInput) => input)
  .handler(({ data }) => core.createSourceRequest(data));

export const approveSourceRequest = createServerFn({ method: "POST" })
  .validator((id: string) => id)
  .handler(({ data }) => {
    guard();
    return core.approveSourceRequest(data);
  });

export const dismissSourceRequest = createServerFn({ method: "POST" })
  .validator((id: string) => id)
  .handler(({ data }) => {
    guard();
    return core.dismissSourceRequest(data);
  });

export const castVote = createServerFn({ method: "POST" })
  .validator(
    (input: { targetType: string; targetId: string; clientId: string; direction: -1 | 0 | 1 }) =>
      input,
  )
  .handler(({ data }) =>
    core.castVote(data.targetType, data.targetId, data.clientId, data.direction),
  );

export const getVotesFor = createServerFn({ method: "POST" })
  .validator((input: { targetType: string; targetIds: string[]; clientId: string }) => input)
  .handler(({ data }) => core.getVotesFor(data.targetType, data.targetIds, data.clientId));

export const listPaths = createServerFn({ method: "POST" }).handler(core.listPaths);

export const upsertPath = createServerFn({ method: "POST" })
  .validator((p: core.ReadingPath) => p)
  .handler(({ data }) => {
    guard();
    return core.upsertPath(data);
  });

export const deletePath = createServerFn({ method: "POST" })
  .validator((id: string) => id)
  .handler(({ data }) => {
    guard();
    return core.deletePath(data);
  });

export const getAuditLog = createServerFn({ method: "POST" })
  .validator((limit: number) => limit)
  .handler(({ data }) => {
    guard();
    return core.getAuditLog(data);
  });

export const aiSuggestSource = createServerFn({ method: "POST" })
  .validator((detail: string) => detail)
  .handler(({ data }) => core.aiSuggestSource(data));
