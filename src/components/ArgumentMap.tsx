import type { Entry } from "@/lib/corpus";
import { statusRing } from "./StatusBadge";

export function ArgumentMap({
  entry,
  focused,
  onFocus,
  className = "",
}: {
  entry: Entry;
  focused: string | null;
  onFocus: (id: string | null) => void;
  className?: string;
}) {
  const { nodes, edges } = entry.map;
  const at = (id: string) => nodes.find((n) => n.id === id)!;
  const focusedNode = focused ? nodes.find((n) => n.id === focused) : undefined;

  return (
    <aside className={`flex-col overflow-y-auto bg-white/30 backdrop-blur-xl ${className}`}>
      <div className="flex items-center justify-between border-b border-white/60 px-4 py-2.5 sm:px-5">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-mist">
          Argument map
        </span>
        <span className="font-mono text-[10px] text-mist">{nodes.length} nodes</span>
      </div>

      <div className="px-4 py-5 sm:px-5">
        <div className="relative h-64">
          <svg
            className="absolute inset-0 size-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            {edges.map(([a, b]) => {
              const na = at(a);
              const nb = at(b);
              const active = focused === a || focused === b;
              return (
                <line
                  key={`${a}-${b}`}
                  x1={na.x}
                  y1={na.y + 4}
                  x2={nb.x}
                  y2={nb.y}
                  stroke="currentColor"
                  className={active ? "text-steel/70" : "text-steel/25"}
                  strokeWidth={active ? 0.7 : 0.4}
                  vectorEffect="non-scaling-stroke"
                />
              );
            })}
          </svg>

          {nodes.map((n) => (
            <button
              key={n.id}
              onClick={() => onFocus(focused === n.id ? null : n.id)}
              onMouseEnter={() => onFocus(n.id)}
              style={{ left: `${n.x}%`, top: `${n.y}%` }}
              className={`absolute -translate-x-1/2 rounded-lg px-2.5 py-1 font-mono ring-1 transition-shadow ${
                n.root
                  ? "bg-white/85 px-3 py-1.5 text-[10px] text-ink ring-steel/25"
                  : `bg-white/70 text-[9px] text-steel ${statusRing(n.status)}`
              } ${focused === n.id ? "shadow-md ring-2" : ""}`}
            >
              {n.label}
            </button>
          ))}
        </div>

        <div className="mt-5 space-y-1.5 border-t border-white/60 pt-4">
          <div className="flex items-center gap-2 font-mono text-[10px] text-steel">
            <span className="size-1.5 rounded-full bg-verify" />
            Verified link
          </div>
          <div className="flex items-center gap-2 font-mono text-[10px] text-steel">
            <span className="size-1.5 rounded-full bg-dispute" />
            Disputed link
          </div>
          <div className="flex items-center gap-2 font-mono text-[10px] text-mist">
            <span className="size-1.5 rounded-full bg-unv" />
            Unverified link
          </div>
        </div>

        <p className="mt-4 font-mono text-[10px] leading-relaxed text-mist">
          Nodes are claims; edges are counter relations. Hover a node to trace its links.
        </p>

        {focusedNode && (
          <div className="mt-4 rounded-lg bg-white/55 p-3 ring-1 ring-white/70">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-steel">
                {focusedNode.label}
              </span>
              <span
                className={`size-2 shrink-0 rounded-full ${
                  focusedNode.status === "verified"
                    ? "bg-verify"
                    : focusedNode.status === "disputed"
                      ? "bg-dispute"
                      : "bg-unv"
                }`}
              />
            </div>
            <p className="mt-1 font-mono text-[10px] capitalize text-mist">
              {focusedNode.root ? "root claim · " : ""}
              {focusedNode.status}
            </p>
            <div className="mt-2 flex flex-wrap gap-1">
              {edges
                .filter(([a, b]) => a === focused || b === focused)
                .map(([a, b]) => {
                  const other = a === focused ? b : a;
                  return (
                    <button
                      key={other}
                      onClick={() => onFocus(other)}
                      className="rounded-full bg-white/70 px-2 py-0.5 font-mono text-[10px] text-steel ring-1 ring-white/80 transition-colors hover:bg-white"
                    >
                      {at(other).label}
                    </button>
                  );
                })}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
