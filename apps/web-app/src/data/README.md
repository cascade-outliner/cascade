# The node data layer

The client owns the outline. `NodeStore` is the source of truth, it is durable in
IndexedDB, and every mutation applies instantly and locally. There is no server
involved in reading or writing nodes — only in authentication.

```
boot      → open IndexedDB → load snapshots + root order → reconcile → hydrate MobX
mutate    → action → applyMutation → reduce (observable state) → write through to IndexedDB
```

## Pieces

| File | Role |
| --- | --- |
| `types.ts` | `NodeSnapshot` (the persisted shape), `Mutation` (the write descriptor) |
| `node.ts` | `NodeModel` — one observable node, plus the `outlineNode` computed `@cascade/ui` renders |
| `node-store.ts` | The store: hydration, reconciliation, actions, the mutation funnel |
| `store-context.tsx` | `StoreProvider` (owns the store, gates SSR) and `useNodeStore` |
| `persistence/` | The IndexedDB schema and a snapshot-in/snapshot-out repository |

`NodeSnapshot` carries both `parentId` and `childIds`. `parentId` gives O(1)
upward walks; `childIds` carries sibling order. They can disagree only if the
store is corrupted, and `NodeStore.reconcile` repairs that on load: entries are
filtered against the child's own `parentId`, and anything left unreachable — an
orphan, or a cycle — is detached and appended at root level rather than dropped.
Root nodes have no parent record to hold their order, so it lives in its own
`roots` object store.

Deletes are soft. `deletedAt` is set on the node and all its descendants, and the
tombstones keep their `childIds` so the subtree stays reconstructable. They are
written to IndexedDB but never materialised into the observable map.

## Adding sync later

Everything sync needs structurally is already here:

- ids are generated on the client (`crypto.randomUUID()`), so a node has a stable
  identity before any server has seen it
- `updatedAt` on every node, and `at` on every mutation, so a mutation is
  replayable rather than dependent on when a reducer happens to run
- `deletedAt` tombstones, so deletes replicate
- one funnel — `NodeStore.applyMutation` — that every single write passes through
- a clean snapshot ⇄ model boundary, and a repository that already speaks in whole
  snapshots, so server deltas can land through the same door

What sync adds:

1. An `outbox` object store: append-only `{ id, mutation, createdAt }`. Appending
   to it becomes step 3 of `applyMutation`. Nothing else in the store moves.
2. A `meta` store holding `lastSyncId`.
3. `push(mutations)` → server returns its authoritative `lastSyncId`;
   `pull(since)` → a delta stream; then a rebase that replays un-acked local
   mutations on top of the incoming deltas.

Server side, this means re-adding a `nodes` table (dropped in the change that
introduced this layer) alongside a monotonic `sync_id` sequence and a delta
endpoint — deliberately *not* the per-row CRUD router that used to live in
`src/orpc/nodes/`. That request-per-keystroke shape is what we walked away from.

## Decisions deliberately deferred

1. **Sibling ordering.** `childIds` is a last-writer-wins array: two devices
   reordering siblings will clobber one another. A fractional index (a `sortKey`
   per node) is the standard fix and should land *before* multi-device support,
   not after.
2. **Conflict granularity.** Per-object last-writer-wins is simplest; per-field
   keeps a remote `expanded` toggle from reverting a local content edit.
3. **Merging `content`.** Whole-document last-writer-wins loses concurrent edits
   to the same node. A CRDT (Yjs) per node is the real answer, and a large
   decision on its own.
4. **Tombstone GC.** `deletedAt` rows accumulate forever without a "safe to purge
   below `lastSyncId`" rule.
5. **Cross-tab coordination.** Two tabs today get two independent stores over one
   IndexedDB and will clobber each other. `BroadcastChannel` or the Web Locks API
   to elect a single syncing tab, and to keep the other stores in step.
6. **Sign-out semantics.** `reset()` drops in-memory state and deliberately leaves
   IndexedDB alone, because right now that is the only copy of the user's data.
   Once data is synced, purging on sign-out becomes the correct — and
   privacy-preserving — behaviour on a shared browser.

## Fine-grained rendering

`outlineNode` is a recursive computed, so an edit invalidates the changed node
*and its ancestor chain*, re-rendering that path. That matches the behaviour this
layer replaced. True per-row granularity needs `OutlineNode.children` in
`@cascade/ui` to carry ids rather than nested nodes — a separate change, and a
prerequisite for virtualizing large trees.
