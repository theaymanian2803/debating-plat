# Admin → Public Corpus End-to-End Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make admin edits (entries, commentaries, rebuttals, taxonomy) appear on the public reading room by deriving the public corpus from the shared `scholia-admin-v1` localStorage store.

**Architecture:** Extend the admin data model so it faithfully round-trips the full corpus structure (`sections`, `map`, rebuttal `counter`/`citations`). Add a pure `adminToEntries()` mapper that converts `AdminData` → `Entry[]`, plus a `useCorpus()` hook that reads the same localStorage key the admin writes (fallback `seedData()`). The public reading room and sidebar consume the derived entries.

**Tech Stack:** React 19, TanStack Start/Router, Vite 8, TypeScript, Vitest (new, for testing the pure mapper).

**Spec:** `docs/superpowers/specs/2026-09-07-admin-corpus-end-to-end-design.md`

## Global Constraints

- All data persists under `STORAGE_KEY = "scholia-admin-v1"` (`src/lib/admin-store.ts:166`).
- `tsconfig.json` has `exactOptionalPropertyTypes: true` — never assign `undefined` to an optional property; use conditional spread (`...(x ? { prop: x } : {})`).
- Path alias `@/` → `src/`. Import types from `@/lib/corpus` (`Verification`, `Citation`, `CommentarySection`, `Entry`, `Rebuttal`).
- The existing `seedData()` in `src/lib/admin-store.ts` is the source of truth for how `Entry` → `AdminData`; the new mapper reverses it.
- No comments in code. Prettier formatting is enforced — run `npx prettier --write <files>` after each code step.
- Do NOT commit unless the user explicitly asks (project rule).

---

### Task 1: Extend the admin data model for faithful round-trip

**Files:**
- Modify: `src/lib/admin-store.ts` (types + `seedData`)
- Modify: `src/routes/admin.entries.tsx` (`blank()`)
- Modify: `src/routes/admin.rebuttals.tsx` (`blank()`)
- Create: `src/lib/__tests__/admin-store.test.ts`
- Modify: `package.json` (add `test` script)
- Create: `vitest.config.ts`

**Interfaces:**
- Consumes: `CommentarySection`, `Citation`, `Entry`, `Rebuttal`, `Verification` from `@/lib/corpus`; `corpusEntries` already imported in `admin-store.ts`.
- Produces: `AdminEntry` gains `sections: CommentarySection[]` and `map: Entry["map"]`; `AdminRebuttal` gains `counter?: Rebuttal["counter"]` and `citations: Citation[]`. `seedData()` populates them. Later tasks rely on these fields.

- [ ] **Step 1: Install Vitest and add the test script**

```bash
npm install -D vitest
```

Add to `package.json` `scripts`:
```json
"test": "vitest run"
```

Create `vitest.config.ts` (separate from `vite.config.ts` so the Lovable wrapper config is untouched):
```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: "node",
    globals: false,
    include: ["src/**/*.test.ts"],
  },
});
```

- [ ] **Step 2: Write the failing seedData round-trip test**

Create `src/lib/__tests__/admin-store.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { seedData } from "@/lib/admin-store";
import { entries as corpusEntries } from "@/lib/corpus";

describe("seedData round-trip", () => {
  it("carries sections and map through to admin entries", () => {
    const data = seedData();
    const first = corpusEntries[0]!;
    const adminEntry = data.entries.find((e) => e.id === first.id)!;
    expect(adminEntry.sections).toEqual(first.sections);
    expect(adminEntry.map).toEqual(first.map);
  });

  it("carries counter and citations through to admin rebuttals", () => {
    const data = seedData();
    const first = corpusEntries[0]!;
    const adminRebut = data.rebuttals.filter((r) => r.entryId === first.id);
    expect(adminRebut.map((r) => r.citations)).toEqual(first.rebuttals.map((r) => r.citations));
    expect(adminRebut.map((r) => r.counter)).toEqual(first.rebuttals.map((r) => r.counter));
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- admin-store`
Expected: FAIL — `seedData` produces entries/rebuttals without `sections`/`map`/`counter`/`citations` (undefined/type errors).

- [ ] **Step 4: Implement the model changes**

In `src/lib/admin-store.ts`, update the import to add the corpus types:
```ts
import {
  entries as corpusEntries,
  type Citation,
  type CommentarySection,
  type Entry,
  type Rebuttal,
  type Verification,
} from "@/lib/corpus";
```

Extend `AdminEntry`:
```ts
export type AdminEntry = {
  id: string;
  kind: "verse" | "premise";
  title: string;
  originalText: string;
  translation: string;
  category: string;
  subCategory: string;
  reference: string;
  tags: string[];
  sections: CommentarySection[];
  map: Entry["map"];
};
```

Extend `AdminRebuttal`:
```ts
export type AdminRebuttal = {
  id: string;
  entryId: string;
  opponent: string;
  stance: string;
  text: string;
  counterRefs: string;
  status: Verification;
  counter?: Rebuttal["counter"];
  citations: Citation[];
};
```

In `seedData()`, the entries map gains the two fields:
```ts
    return {
      id: e.id,
      kind: e.kind,
      title: e.title,
      originalText: e.primary,
      translation: e.secondary,
      category: categoryLabel[e.collection] ?? e.collection,
      subCategory: parts[parts.length - 1] ?? "",
      reference: e.subtitle,
      tags: e.map.nodes.slice(0, 3).map((n) => n.label),
      sections: e.sections,
      map: e.map,
    };
```

The rebuttals map gains counter and citations (conditional spread for `counter` due to `exactOptionalPropertyTypes`):
```ts
  const rebuttals: AdminRebuttal[] = corpusEntries.flatMap((e) =>
    e.rebuttals.map((r) => ({
      id: uid("reb"),
      entryId: e.id,
      opponent: r.counter?.author ?? r.perspective,
      stance: r.perspective,
      text: r.counter?.body ?? r.claim,
      counterRefs: r.citations.map((c) => c.label).join("; "),
      status: r.status,
      ...(r.counter ? { counter: r.counter } : {}),
      citations: r.citations,
    })),
  );
```

In `src/routes/admin.entries.tsx`, update `blank()`:
```ts
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
```

In `src/routes/admin.rebuttals.tsx`, update `blank()` (omit `counter` — do not assign `undefined`):
```ts
  const blank = (): AdminRebuttal => ({
    id: uid("reb"),
    entryId,
    opponent: "",
    stance: "",
    text: "",
    counterRefs: "",
    status: "unverified",
    citations: [],
  });
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Format and type-check**

Run: `npx prettier --write src/lib/admin-store.ts src/routes/admin.entries.tsx src/routes/admin.rebuttals.tsx vitest.config.ts package.json src/lib/__tests__/admin-store.test.ts`
Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/lib/admin-store.ts src/routes/admin.entries.tsx src/routes/admin.rebuttals.tsx vitest.config.ts package.json src/lib/__tests__/admin-store.test.ts
git commit -m "feat(admin): round-trip sections, map, counter, citations in admin store"
```
(Skip commit if the user has not requested commits.)

---

### Task 2: Build the corpus adapter

**Files:**
- Create: `src/lib/corpus-adapter.ts`
- Create: `src/lib/__tests__/corpus-adapter.test.ts`

**Interfaces:**
- Consumes: `AdminData` from `@/lib/admin-store`; `Entry`, `CommentarySection`, `Citation`, `Verification` from `@/lib/corpus`.
- Produces:
  - `collectionIdFor(label: string): string`
  - `collectionLabelFor(id: string): string`
  - `adminToEntries(admin: AdminData): Entry[]`
  - `collectionsFor(entries: Entry[]): { id: string; label: string }[]`
  - Later tasks (`use-corpus`) consume `adminToEntries` and `collectionsFor`.

- [ ] **Step 1: Write the failing adapter tests**

Create `src/lib/__tests__/corpus-adapter.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { seedData } from "@/lib/admin-store";
import { adminToEntries, collectionsFor } from "@/lib/corpus-adapter";

describe("adminToEntries", () => {
  it("maps seed data back to corpus entries faithfully", () => {
    const admin = seedData();
    const entries = adminToEntries(admin);
    expect(entries.length).toBe(admin.entries.length);
    const first = entries[0]!;
    expect(first.primary).toBe(admin.entries[0]!.originalText);
    expect(first.secondary).toBe(admin.entries[0]!.translation);
    expect(first.subtitle).toBe(admin.entries[0]!.reference);
    expect(first.sections.length).toBeGreaterThan(0);
    expect(first.map.nodes.length).toBeGreaterThan(0);
    const expectedRebut = admin.rebuttals.filter((r) => r.entryId === first.id);
    expect(first.rebuttals).toHaveLength(expectedRebut.length);
    expect(first.rebuttals[0]?.counter).toEqual(expectedRebut[0]?.counter);
    expect(first.rebuttals[0]?.citations).toEqual(expectedRebut[0]?.citations);
  });

  it("reflects title edits", () => {
    const admin = seedData();
    admin.entries[0]!.title = "Renamed Entry";
    expect(adminToEntries(admin)[0]!.title).toBe("Renamed Entry");
  });

  it("merges admin commentaries as an editorial section", () => {
    const admin = seedData();
    const firstId = admin.entries[0]!.id;
    admin.commentaries.push({
      id: "com-new",
      entryId: firstId,
      scholar: "New Scholar",
      text: "A brand-new note.",
      book: "Some Book",
      volumePage: "p. 10",
      sourceRef: "Archive X",
      status: "verified",
    });
    const entry = adminToEntries(admin).find((e) => e.id === firstId)!;
    const editorial = entry.sections.find((s) => s.title === "Editorial commentary");
    expect(editorial?.body).toBe("A brand-new note.");
    expect(editorial?.citations[0]?.label).toBe("New Scholar");
    expect(editorial?.citations[0]?.status).toBe("verified");
  });

  it("maps unknown category labels to slugged collection ids", () => {
    const admin = seedData();
    admin.entries[0]!.category = "Political Thought";
    expect(adminToEntries(admin)[0]!.collection).toBe("political-thought");
  });

  it("maps known labels back to the corpus collection ids", () => {
    const admin = seedData();
    const entries = adminToEntries(admin);
    const ids = entries.map((e) => e.collection);
    expect(ids).toContain("religious");
    expect(ids).toContain("philosophy");
    expect(ids).toContain("ethics");
  });
});

describe("collectionsFor", () => {
  it("derives unique collections from entries with canonical labels", () => {
    const admin = seedData();
    const cols = collectionsFor(adminToEntries(admin));
    expect(cols.find((c) => c.id === "religious")?.label).toBe("Religious texts");
    expect(cols.find((c) => c.id === "philosophy")?.label).toBe("Philosophy");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- corpus-adapter`
Expected: FAIL — `@/lib/corpus-adapter` module not found.

- [ ] **Step 3: Implement `src/lib/corpus-adapter.ts`**

```ts
import type { Entry } from "@/lib/corpus";
import type { AdminData } from "@/lib/admin-store";

const labelToCollectionId: Record<string, string> = {
  Religion: "religious",
  Philosophy: "philosophy",
  Ethics: "ethics",
};

const collectionLabel: Record<string, string> = {
  religious: "Religious texts",
  philosophy: "Philosophy",
  ethics: "Ethics",
};

export function collectionIdFor(label: string): string {
  return (
    labelToCollectionId[label] ??
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") ||
    "custom"
  );
}

export function collectionLabelFor(id: string): string {
  return collectionLabel[id] ?? id;
}

export function adminToEntries(admin: AdminData): Entry[] {
  return admin.entries.map((e) => {
    const collection = collectionIdFor(e.category);
    const breadcrumb = [
      "Sources",
      collectionLabelFor(collection),
      e.subCategory || e.title,
    ].join(" / ");

    const editorial = admin.commentaries
      .filter((c) => c.entryId === e.id)
      .map((c) => ({
        id: c.id,
        title: "Editorial commentary",
        body: c.text,
        citations: [
          {
            id: `${c.id}-cit`,
            label: c.scholar,
            detail: [c.book, c.volumePage].filter(Boolean).join(" · "),
            status: c.status,
            archive: c.sourceRef,
          },
        ],
      }));

    return {
      id: e.id,
      kind: e.kind,
      collection,
      breadcrumb,
      title: e.title,
      subtitle: e.reference,
      primary: e.originalText,
      secondary: e.translation,
      sections: [...e.sections, ...editorial],
      rebuttals: admin.rebuttals
        .filter((r) => r.entryId === e.id)
        .map((r) => ({
          id: r.id,
          perspective: r.stance,
          claim: r.text,
          status: r.status,
          ...(r.counter ? { counter: r.counter } : {}),
          citations: r.citations,
        })),
      map: e.map,
    } satisfies Entry;
  });
}

export function collectionsFor(entries: Entry[]): { id: string; label: string }[] {
  const seen = new Map<string, string>();
  for (const e of entries) {
    if (!seen.has(e.collection)) seen.set(e.collection, collectionLabelFor(e.collection));
  }
  return Array.from(seen.entries()).map(([id, label]) => ({ id, label }));
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS (all adapter + admin-store tests).

- [ ] **Step 5: Format and type-check**

Run: `npx prettier --write src/lib/corpus-adapter.ts src/lib/__tests__/corpus-adapter.test.ts`
Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/corpus-adapter.ts src/lib/__tests__/corpus-adapter.test.ts
git commit -m "feat(corpus): add admin-to-entry adapter with tests"
```
(Skip commit if the user has not requested commits.)

---

### Task 3: Wire the public reading room to the shared store

**Files:**
- Create: `src/lib/use-corpus.ts`
- Modify: `src/routes/index.tsx`
- Modify: `src/components/CorpusSidebar.tsx`

**Interfaces:**
- Consumes: `adminToEntries`, `collectionsFor` from `@/lib/corpus-adapter`; `seedData`, `STORAGE_KEY`, `AdminData` from `@/lib/admin-store`; `Entry` type from `@/lib/corpus`.
- Produces: `useCorpus(): { entries: Entry[]; collections: { id: string; label: string }[] }` — consumed by `index.tsx` and passed into `CorpusSidebar`.

- [ ] **Step 1: Create `src/lib/use-corpus.ts`**

```ts
import { useEffect, useMemo, useState } from "react";
import { seedData, STORAGE_KEY, type AdminData } from "@/lib/admin-store";
import { adminToEntries, collectionsFor } from "@/lib/corpus-adapter";
import type { Entry } from "@/lib/corpus";

export function useCorpus(): {
  entries: Entry[];
  collections: { id: string; label: string }[];
} {
  const [saved, setSaved] = useState<AdminData | null>(null);

  useEffect(() => {
    const load = () => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        setSaved(raw ? (JSON.parse(raw) as AdminData) : null);
      } catch {
        setSaved(null);
      }
    };
    load();
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) load();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return useMemo(() => {
    const entries = adminToEntries(saved ?? seedData());
    return { entries, collections: collectionsFor(entries) };
  }, [saved]);
}
```

- [ ] **Step 2: Update `src/routes/index.tsx`**

Replace the static import with the hook:
```ts
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { citationCount } from "@/lib/corpus";
import { useCorpus } from "@/lib/use-corpus";
import { CorpusSidebar } from "@/components/CorpusSidebar";
import { PrimaryPane } from "@/components/PrimaryPane";
import { RebuttalPane } from "@/components/RebuttalPane";
import { ArgumentMap } from "@/components/ArgumentMap";
import { CitationLedger } from "@/components/CitationLedger";
```

In `ReadingRoom`, replace `const entry = entries.find(...)` with hook-based data and an empty-state guard:
```ts
function ReadingRoom() {
  const { entries, collections } = useCorpus();
  const [selectedId, setSelectedId] = useState(entries[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [collection, setCollection] = useState<string | null>(null);
  const [perspective, setPerspective] = useState<string | null>(null);
  const [focusedNode, setFocusedNode] = useState<string | null>(null);
  const [ledgerOpen, setLedgerOpen] = useState(false);

  useEffect(() => {
    if (selectedId && !entries.some((e) => e.id === selectedId)) {
      setSelectedId(entries[0]?.id ?? "");
    }
  }, [entries, selectedId]);

  const entry = entries.find((e) => e.id === selectedId) ?? entries[0] ?? null;

  if (!entry) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[oklch(0.965_0.008_255)] to-[oklch(0.905_0.02_258)] font-sans text-ink">
        <p className="rounded-2xl bg-white/50 px-6 py-8 text-center font-serif text-[15px] text-steel ring-1 ring-white/70 backdrop-blur-xl">
          The corpus is empty. Add entries in the admin area to populate the reading room.
        </p>
      </div>
    );
  }

  const select = (id: string) => {
    setSelectedId(id);
    setPerspective(null);
    setFocusedNode(null);
  };
  // ...rest of the existing component, passing entries/collections:
  // <CorpusSidebar entries={entries} collections={collections} ... />
}
```

Pass the new props to the sidebar:
```tsx
<CorpusSidebar
  entries={entries}
  collections={collections}
  selectedId={entry.id}
  onSelect={select}
  query={query}
  onQueryChange={setQuery}
  activeCollection={collection}
  onCollectionChange={setCollection}
/>
```

Keep the rest of the component (header, `PrimaryPane`, `RebuttalPane`, `ArgumentMap`, `CitationLedger`) unchanged.

- [ ] **Step 3: Update `src/components/CorpusSidebar.tsx`**

Change the signature to accept props and remove the static imports:
```tsx
import type { Entry } from "@/lib/corpus";

export function CorpusSidebar({
  entries,
  collections,
  selectedId,
  onSelect,
  query,
  onQueryChange,
  activeCollection,
  onCollectionChange,
}: {
  entries: Entry[];
  collections: { id: string; label: string }[];
  selectedId: string;
  onSelect: (id: string) => void;
  query: string;
  onQueryChange: (v: string) => void;
  activeCollection: string | null;
  onCollectionChange: (id: string | null) => void;
}) {
```

Replace the `verses`/`premises` filters and the collections section to use the props (`entries`, `collections`) instead of the module-level imports. The `matches` helper stays the same.

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Format**

Run: `npx prettier --write src/lib/use-corpus.ts src/routes/index.tsx src/components/CorpusSidebar.tsx`

- [ ] **Step 6: Commit**

```bash
git add src/lib/use-corpus.ts src/routes/index.tsx src/components/CorpusSidebar.tsx
git commit -m "feat(reading-room): render corpus from the shared admin store"
```
(Skip commit if the user has not requested commits.)

---

### Task 4: Verify end to end

**Files:**
- None (verification only).

**Interfaces:**
- Consumes: everything from Tasks 1–3.

- [ ] **Step 1: Run the unit tests**

Run: `npm test`
Expected: all tests PASS.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Production build**

Run: `npm run build`
Expected: `✓ built` for client, ssr, and nitro stages, no errors.

- [ ] **Step 4: Dev-server smoke test**

Run: `npm run dev`, then manually verify:
- `/` loads with the seeded corpus (unaffected when no admin edits exist).
- Edit an entry's title in `/admin/entries` → the new title appears on `/` (pane + sidebar).
- Add a new entry in admin → it appears in the public sidebar and renders (with no sections/map — verify no crash).
- Delete an entry in admin → it disappears from `/`.
- Add/edit a commentary in `/admin/commentaries` → an "Editorial commentary" section appears on the public PrimaryPane for that entry.
- Add/edit a rebuttal in `/admin/rebuttals` → it appears in the public rebuttal pane.
- Add a category in `/admin/taxonomy` → sidebar "Collections" reflects it (via derived collections).
- "Reset to sample corpus" in admin → public site returns to the seed state.

- [ ] **Step 5: Final check**

Confirm `git status` shows only expected files (the three new files, modified admin-store/routes/components, `vitest.config.ts`, `package.json`, tests). Report results to the user.
