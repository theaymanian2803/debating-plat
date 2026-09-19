import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, ShieldCheck, X } from "lucide-react";
import { siteNavItems, type SiteNavItem } from "@/lib/nav";

export function SiteNav() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const close = () => setOpen(false);

  return (
    <>
      <nav className="sticky top-0 z-50 flex items-center gap-1 border-b border-white/60 bg-white/35 px-4 py-2 backdrop-blur-xl sm:px-6">
        <span className="mr-4 shrink-0 font-serif text-[15px] leading-none font-medium text-ink">
          Scholia
        </span>
        <div className="hidden items-center gap-1 lg:flex">
          {siteNavItems.map((item) => (
            <NavLink key={item.to} item={item} />
          ))}
        </div>
        <Link
          to="/admin"
          aria-label="Admin"
          title="Editorial desk"
          className="ml-auto rounded-md p-2 text-steel ring-1 ring-transparent transition-colors hover:bg-white/60 hover:text-ink lg:ml-3"
        >
          <ShieldCheck className="size-5" />
        </Link>
        <button
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          aria-expanded={open}
          className="rounded-md p-2 text-ink transition-colors hover:bg-white/50 lg:hidden"
        >
          <Menu className="size-5" />
        </button>
      </nav>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Close menu"
            onClick={close}
            className="absolute inset-0 bg-ink/20 backdrop-blur-sm"
          />
          <div className="absolute inset-y-0 left-0 flex w-64 max-w-[85vw] flex-col overflow-y-auto border-r border-white/60 bg-white/70 px-4 py-5 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between px-2">
              <div className="font-serif text-lg leading-none font-medium">Scholia</div>
              <button
                onClick={close}
                aria-label="Close menu"
                className="rounded-md p-2 text-steel transition-colors hover:bg-white/60"
              >
                <X className="size-4" />
              </button>
            </div>
            <nav className="mt-6 space-y-1">
              {siteNavItems.map((item) => (
                <NavLink key={item.to} item={item} onNavigate={close} />
              ))}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}

function NavLink({ item, onNavigate }: { item: SiteNavItem; onNavigate?: () => void }) {
  return (
    <Link
      to={item.to}
      onClick={onNavigate}
      activeOptions={{ exact: item.to === "/" }}
      activeProps={{ className: "bg-ink text-paper ring-ink/15" }}
      inactiveProps={{ className: "text-steel ring-transparent hover:bg-white/60" }}
      className="block min-h-11 rounded-lg px-3 py-2 font-mono text-[11px] uppercase tracking-[0.14em] ring-1 transition"
    >
      {item.label}
    </Link>
  );
}
