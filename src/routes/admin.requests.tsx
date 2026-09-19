import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { approveSourceRequest, dismissSourceRequest, listSourceRequests } from "@/lib/corpus-api";
import { Button, EmptyRow, Panel, Select } from "@/components/admin/ui";
import { StatusBadge } from "@/components/StatusBadge";

export const Route = createFileRoute("/admin/requests")({
  head: () => ({
    meta: [
      { title: "Source requests — Scholia Admin" },
      {
        name: "description",
        content: "Review reader-submitted citations and promote them to verified sources.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RequestsPage,
});

const badge = { pending: "disputed", approved: "verified", dismissed: "unverified" } as const;

function RequestsPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"pending" | "approved" | "dismissed" | "all">("pending");

  const { data, refetch } = useQuery({
    queryKey: ["source-requests"],
    queryFn: () => listSourceRequests({ data: "all" }),
  });

  const shown = (data ?? []).filter((r) => filter === "all" || r.status === filter);

  const approve = async (id: string) => {
    await approveSourceRequest({ data: id });
    await queryClient.invalidateQueries({ queryKey: ["corpus"] });
    refetch();
  };

  const dismiss = async (id: string) => {
    await dismissSourceRequest({ data: id });
    refetch();
  };

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div>
        <h1 className="font-serif text-2xl leading-tight font-medium">Source requests</h1>
        <p className="mt-1 text-[13px] text-mist">
          Readers flag citations that lack an archive. Approving a request registers a verified
          source and promotes every matching citation across the corpus.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={filter}
          onChange={(e) => setFilter(e.target.value as typeof filter)}
          className="w-auto"
        >
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="dismissed">Dismissed</option>
          <option value="all">All</option>
        </Select>
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-mist">
          {(data ?? []).filter((r) => r.status === "pending").length} pending
        </span>
      </div>

      <Panel title="Requests" subtitle={`${shown.length} shown`}>
        {shown.length === 0 ? (
          <EmptyRow>No requests here.</EmptyRow>
        ) : (
          <ul className="space-y-2">
            {shown.map((r) => (
              <li key={r.id} className="rounded-xl bg-white/55 px-3.5 py-3 ring-1 ring-white/75">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-mist">
                      {new Date(r.createdAt).toLocaleString()} · target
                    </div>
                    <p className="mt-0.5 text-[13px] leading-snug text-steel">{r.target}</p>
                    <div className="mt-2 rounded-lg bg-white/45 px-2.5 py-2 ring-1 ring-white/70">
                      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-mist">
                        Proposed citation
                      </div>
                      <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink">{r.proposal}</p>
                      {(r.archive || r.note) && (
                        <p className="mt-1 font-mono text-[10px] text-mist">
                          {r.archive}
                          {r.archive && r.note ? " · " : ""}
                          {r.note}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <StatusBadge status={badge[r.status]} label={r.status} />
                    {r.status === "pending" && (
                      <div className="flex gap-1.5">
                        <Button onClick={() => approve(r.id)}>Approve</Button>
                        <Button variant="ghost" onClick={() => dismiss(r.id)}>
                          Dismiss
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
