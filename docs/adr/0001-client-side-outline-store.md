# 1. Client-side outline store (`@cascade/data`)

- Status: accepted
- Date: 2026-08-27

## Context

The outline is the app's only real data. An earlier version round-tripped every
keystroke, toggle, indent and delete to Postgres via oRPC + TanStack Query;
latency sat on the editing path and the app was useless offline. That was
replaced by a client-owned MobX store (`c6edb5e`), which was then removed whole
(`263a472`) as over-built: a serialized `Mutation` command union funnelled
through a reducer, soft-delete tombstones, a `reconcile` repair pass that
rescued orphans and cycles, a per-node observable class, a separate root-order
record.

This ADR is the rebuild: the smallest observable model the outliner needs,
client-only and in-memory, with seams left only where a concrete next step
(persistence) or a committed goal (sync) will use them.

## Decision

`packages/data` exports a framework-agnostic `OutlineStore` (MobX
`makeAutoObservable`) plus `emptyState` and the `Node` / `OutlinePersistence`
types. No React: the context provider, `enableStaticRendering`, and edit
debouncing live in `apps/web-app`.

- **Normalised.** `Map<string, Node>`. Each `Node` carries `parentId` *and*
  `childIds`. A single synthetic root node (`__root__`) holds top-level order;
  the public API uses `parentId: null` for "top level" and never exposes the
  root.
- **Invariant, not repair.** Every structural write goes through the store's
  private helpers, which keep `parentId` and `childIds` in agreement. There is
  no load-time `reconcile`.
- **Imperative actions.** `create` / `setContent` / `setCollapsed` / `move` /
  `remove`, mapping 1:1 to the outliner's callbacks. No command objects.
- **`tree` computed.** Rebuilds the whole `OutlineNode[]` for `@cascade/ui` on
  any change; the visible tree is small.
- **Hard delete.** `remove` drops the subtree from the map.
- **In-memory.** `OutlinePersistence` is a no-op by default; the store already
  routes every write through `#persist`.
- **Invalid ops are no-ops** and `move` returns `false`. `create` throws on an
  unknown parent (no id to return). Stale ids from a React render are normal.
- Runtime assumes a modern browser or Node 22: `crypto.randomUUID`, `Date.now`
  called inline.

## Deferred

Each item below is out of scope now. The trigger is when it stops being
speculative; the seam is where it attaches.

| Deferred | Revive when | Seam |
| --- | --- | --- |
| IndexedDB persistence | next step | `OutlinePersistence`; pass an adapter to the `OutlineStore` constructor |
| `userId` scoping | persistence lands (to key the IDB store) | store constructor |
| Hydrate-time validation (throw/log on `parentId`↔`childIds` divergence) | persistence lands | new `hydrate()` path; not the old silent rescue |
| Sync outbox / diffing | sync design starts | `#persist` — currently a whole-snapshot save |
| Soft-delete tombstones (`deletedAt`) | sync design starts | `remove`, `Node` |
| Serialized mutation / command log | sync design starts | replaces the imperative action bodies |
| Fractional sibling indexing | multi-device sync | `childIds` array → ordered keys; `#insertChild` |
| Injected clock / id generator | replayable mutations exist | `Date.now()` / `crypto.randomUUID()` call sites |
| `createdAt` on `Node` | sync conflict resolution wants it | `Node`, `create` |
| Per-subtree memoisation of `tree` | profiling shows whole-tree rebuild cost | `tree` getter |
