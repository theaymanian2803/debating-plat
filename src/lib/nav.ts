export type SiteNavItem = { to: string; label: string };

export const siteNavItems: SiteNavItem[] = [
  { to: "/", label: "Reading Room" },
  { to: "/admin", label: "Overview" },
  { to: "/admin/entries", label: "Entries" },
  { to: "/admin/commentaries", label: "Commentary" },
  { to: "/admin/rebuttals", label: "Rebuttals" },
  { to: "/admin/sources", label: "Sources" },
  { to: "/admin/taxonomy", label: "Taxonomy" },
];
