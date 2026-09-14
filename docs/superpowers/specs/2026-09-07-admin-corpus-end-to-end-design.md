# Design: Wire Admin Edits into the Public Reading Room

Date: 2026-09-07
Status: Approved (approach A — adapter + round-trip model)

## Problem

The admin area (`/admin`) edits an `AdminData` shape persisted to `localStorage`
under `scholia-admin-v1` (`src/lib/admin-store.ts`). The public reading room
(`/`) renders the static `entries` array from `src/lib/corpus.ts`. Because the
two sides never share data, admin edits to entries, commentaries, rebuttals,
sources, and taxonomy have no effect on the public site.

The blocker to sharing: `AdminData` is a flattened view that drops structure the
public components need — entry `sections` (with citations), argument `map`
(nodes/edges), and rebuttal `counter`/`citations`.

## Approach

Adapter + round-trip model. Extend the admin model so it faithfully carries the
full corpus structure, then derive the public `Entry[]` from the shared
localStorage store via a mapper. Public components stay unchanged except for
their data source.

## 1. Data model changes (`src/lib/admin-store.ts`)

- `AdminEntry` gains round-trip fields:
  - `sections: CommentarySection[]`
  - `map: Entry["map"]` (nodes/edges)
- `AdminRebuttal` gains round-trip fields:
  - `counter?: Rebuttal["counter"]`
  - `citations: Citation[]`
- Existing form fields are unchanged. The new fields are seeded from the corpus
  and preserved, but not yet editable in the admin UI.
- `seedData()` populates the new fields from `corpusEntries`.
- Admin page `blank()` defaults: `sections: []`, `map: { nodes: [], edges: [] }`,
  `citations: []`, `counter: undefined`.

## 2. New adapter `src/lib/corpus-adapter.ts`

- `adminToEntries(admin: AdminData): Entry[]`
  - `AdminEntry` → `Entry`:
    - `primary ← originalText`, `secondary ← translation`,
      `subtitle ← reference`, `title`, `kind`, `id` direct.
    - `collection`: reverse of the existing label map
      (`Religion → religious`, `Philosophy → philosophy`, `Ethics → ethics`);
      unknown categories → slugified label.
    - `breadcrumb`: `"Sources / {collectionLabel} / {subCategory}"` (or
      fallback to title when no sub-category).
    - `sections ← AdminEntry.sections`
    - `map ← AdminEntry.map`
    - `rebuttals ← data.rebuttals` filtered by `entryId`, mapped:
      `perspective ← stance`, `claim ← text`, `status`, `counter`, `citations`.
  - Admin's flat `commentaries` for the entry are merged as a derived
    "Editorial commentary" section appended to `sections`, so Commentary-page
    edits appear on the public pane. Each commentary becomes a section
    `{ id, title: "Editorial commentary", body: c.text, citations: [{ id,
    label: c.scholar, detail: `${book} · ${volumePage}`, status: c.status,
    archive: c.sourceRef }] }`.
- `collectionsFor(entries): { id, label }[]` — derive the collection list from
  live entries so taxonomy/category changes flow through to the sidebar.
- Helpers `collectionIdFor(label)` / `collectionLabelFor(id)`.

## 3. Public data injection

- New `src/lib/use-corpus.ts` hook:
  - State `admin: AdminData | null` (`null` = no saved edits → `seedData()`).
  - On mount: read `localStorage[STORAGE_KEY]`; subscribe to the `storage`
    event so cross-tab edits live-update.
  - Memo: `entries = adminToEntries(admin ?? seedData())`,
    `collections = collectionsFor(entries)`.
  - SSR-safe: initial render uses `seedData()`; `useEffect` swaps in saved data
    client-side (same hydrate pattern as the admin layout).
- `src/routes/index.tsx`: use `useCorpus()`; pass `entries`/`collections` to the
  sidebar. Selected-entry fallback `?? entries[0]` already exists.
- `src/components/CorpusSidebar.tsx`: take `entries` + `collections` as props;
  remove direct imports of `entries`/`collections` from `corpus.ts`.

## 4. Robustness / edge cases

- Empty `map` / `sections` for admin-added entries: components already tolerate
  empty arrays (`sections[0]?.id ?? ""`; empty node/edge arrays render fine).
- Selected entry deleted in admin: existing `?? entries[0]` fallback.
- Fully empty corpus: friendly empty state in the reading room.
- Collection filter references only collections present in current data, so
  filters always remain valid.
- Out of scope: syncing source-registry verification toggles onto per-entry
  citation badges (deeper coupling; can be added later).

## 5. Verification

No test framework is configured in this project. Verification steps:
- `npx tsc --noEmit` passes.
- `npm run build` passes.
- `npm run dev` smoke test:
  - Edit an entry title → appears on public pane + sidebar.
  - Add a new entry → appears in sidebar and renders.
  - Delete an entry → removed from public site.
  - Edit/add a commentary → derived "Editorial commentary" section appears.
  - Edit/add a rebuttal → appears in the rebuttal pane.
  - Add a category/tag → reflected in sidebar collections / entry metadata.
