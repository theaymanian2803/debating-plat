import { useState } from "react";
import { allCitations, type Entry, type Verification } from "@/lib/corpus";
import { aiSuggestSource, createSourceRequest } from "@/lib/corpus-api";
import { StatusBadge } from "./StatusBadge";
import { Sparkles } from "lucide-react";

export function CitationLedger({ entry, onClose }: { entry: Entry; onClose: () => void }) {
  const citations = allCitations(entry);
  const unique = Array.from(new Map(citations.map((c) => [c.detail, c])).values());
  const tally = (s: Verification) => unique.filter((c) => c.status === s).length;

  const [openFor, setOpenFor] = useState<string | null>(null);
  const [proposal, setProposal] = useState("");
  const [archive, setArchive] = useState("");
  const [note, setNote] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiHint, setAiHint] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);

  const reset = () => {
    setOpenFor(null);
    setProposal("");
    setArchive("");
    setNote("");
    setAiHint(null);
  };

  const suggest = async (detail: string) => {
    setAiBusy(true);
    setAiHint(null);
    const res = await aiSuggestSource({ data: detail });
    setAiBusy(false);
    if (res.available && res.suggestion) {
      setAiHint(res.suggestion);
      setArchive(res.suggestion);
    } else if (!res.available) {
      setAiHint("AI verification is not configured on this deployment.");
    } else {
      setAiHint("The model returned no archive suggestion.");
    }
  };

  const submit = async (detail: string) => {
    if (!proposal.trim()) return;
    await createSourceRequest({
      data: {
        entryId: entry.id,
        target: detail,
        proposal,
        archive,
        note,
      },
    });
    setSent(detail);
    setOpenFor(null);
    reset();
  };

  return (
    <div className="border-t border-white/60 bg-white/35 backdrop-blur-xl">
      <div className="flex items-center gap-3 px-4 py-2.5 sm:px-7">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-mist">
          Citation ledger
        </span>
        <StatusBadge status="verified" label={`${tally("verified")} verified`} />
        <StatusBadge status="disputed" label={`${tally("disputed")} disputed`} />
        <StatusBadge status="unverified" label={`${tally("unverified")} unverified`} />
        <button
          onClick={onClose}
          className="ml-auto rounded-md px-2.5 py-1.5 font-mono text-[10px] text-mist transition-colors hover:bg-white/50"
        >
          close
        </button>
      </div>
      <div className="max-h-[45vh] overflow-y-auto border-t border-white/60 px-4 py-3 sm:max-h-44 sm:px-7">
        <ul className="space-y-2">
          {unique.map((c) => (
            <li key={c.detail} className="flex flex-col gap-1.5">
              <div className="flex items-start justify-between gap-4">
                <p className="font-mono text-[11px] leading-relaxed text-steel">
                  {c.detail} <span className="text-mist">· {c.archive}</span>
                </p>
                <div className="flex shrink-0 items-center gap-1.5">
                  {sent === c.detail && (
                    <span className="font-mono text-[10px] text-verify">request sent</span>
                  )}
                  {c.status !== "verified" && openFor !== c.detail && sent !== c.detail && (
                    <button
                      onClick={() => {
                        reset();
                        setOpenFor(c.detail);
                      }}
                      className="rounded-md px-2 py-0.5 font-mono text-[10px] text-steel ring-1 ring-white/80 transition-colors hover:bg-white/60"
                    >
                      Request source
                    </button>
                  )}
                  <StatusBadge status={c.status} className="shrink-0" />
                </div>
              </div>

              {openFor === c.detail && (
                <div className="rounded-lg bg-white/45 p-3 ring-1 ring-white/75">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-mist">
                      Propose a source for “{c.label}”
                    </span>
                    <button
                      onClick={() => reset()}
                      className="font-mono text-[10px] text-mist hover:text-steel"
                    >
                      cancel
                    </button>
                  </div>
                  <div className="mt-2 space-y-2">
                    <textarea
                      value={proposal}
                      onChange={(e) => setProposal(e.target.value)}
                      placeholder="Full citation you can verify, e.g. Author, Title. Publisher, year, pages."
                      className="w-full rounded-md bg-white/70 px-2.5 py-1.5 text-[12px] text-ink ring-1 ring-white/80 outline-none placeholder:text-unv"
                    />
                    <div className="flex gap-2">
                      <input
                        value={archive}
                        onChange={(e) => setArchive(e.target.value)}
                        placeholder="Archive or shelfmark"
                        className="min-w-0 flex-1 rounded-md bg-white/70 px-2.5 py-1.5 text-[12px] text-ink ring-1 ring-white/80 outline-none placeholder:text-unv"
                      />
                      <button
                        onClick={() => suggest(c.detail)}
                        disabled={aiBusy}
                        className="flex shrink-0 items-center gap-1 rounded-md bg-white/60 px-2.5 py-1.5 font-mono text-[10px] text-steel ring-1 ring-white/80 transition-colors hover:bg-white/80 disabled:opacity-50"
                      >
                        <Sparkles className="size-3" />
                        {aiBusy ? "…" : "AI suggest"}
                      </button>
                    </div>
                    {aiHint && (
                      <p className="font-mono text-[10px] leading-relaxed text-mist">{aiHint}</p>
                    )}
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Optional note to the editorial desk"
                      className="w-full rounded-md bg-white/70 px-2.5 py-1.5 text-[12px] text-ink ring-1 ring-white/80 outline-none placeholder:text-unv"
                      rows={1}
                    />
                    <div className="flex justify-end gap-1.5">
                      <button
                        onClick={() => submit(c.detail)}
                        disabled={!proposal.trim()}
                        className="rounded-md bg-ink px-3 py-1.5 text-[11px] font-medium text-paper ring-1 ring-ink/10 transition-opacity hover:opacity-90 disabled:opacity-40"
                      >
                        Submit request
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
