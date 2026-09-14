import { describe, expect, it } from "vitest";
import { siteNavItems } from "@/lib/nav";

describe("siteNavItems", () => {
  it("links to the reading room and every admin section", () => {
    const hrefs = siteNavItems.map((n) => n.to);
    expect(hrefs).toContain("/");
    expect(hrefs).toContain("/admin");
    expect(hrefs).toContain("/admin/entries");
    expect(hrefs).toContain("/admin/commentaries");
    expect(hrefs).toContain("/admin/rebuttals");
    expect(hrefs).toContain("/admin/sources");
    expect(hrefs).toContain("/admin/taxonomy");
  });

  it("leads with the reading room, then the admin overview", () => {
    expect(siteNavItems[0]?.to).toBe("/");
    expect(siteNavItems[1]?.to).toBe("/admin");
  });

  it("gives every link a label", () => {
    for (const item of siteNavItems) {
      expect(item.label.trim().length).toBeGreaterThan(0);
    }
  });
});
