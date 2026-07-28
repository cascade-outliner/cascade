# Node deletion lifecycle seam

**Issue:** [#535](https://github.com/cascade-outliner/cascade/issues/535)
**Depended on by:** [#536](https://github.com/cascade-outliner/cascade/issues/536) (visible-tree change module), [#537](https://github.com/cascade-outliner/cascade/issues/537), [#540](https://github.com/cascade-outliner/cascade/issues/540)
**Date:** 2026-07-28
**Status:** Design only; no production behavior changed.

> **Attribution.** #536 (its sibling design) already carries a maintainer decision
> comment. #535 does not — as of this writing no maintainer has posted a resolution
> on it. The decision below was made by Claude, acting on explicit authorization to
> resolve this issue in a maintainer's place, not by a maintainer. It is written to
> the same standard of justification a maintainer decision would require, precisely
> because nobody else has reviewed it yet.

## Decision

Deletion stays an **internal command of the #536 visible-tree change module**
(Design 1 below). There is no new external `NodeDeletionLifecycle` interface, and
`packages/outliner` gains no deletion-specific export. `VisibleTree.remove(id)`
remains the only caller-facing surface; undo and redo re-enter the same
`VisibleTreeChangeModule.execute()` protocol #536 already specified for `remove`
and `restore` commands.

The lifecycle depends on one new internal port, `NodeDeletionRemote`, supplying
delete/restore over an **opaque server-issued deletion reference** rather than a
client-built subtree receipt. The server captures the complete subtree —
collapsed and unloaded descendants included — atomically inside the same
transaction as the delete, for every user, not only premium users. The client
never sees subtree contents at delete time; `fetchFullSubtree`'s pre-delete
collapsed-descendant walk is removed entirely.

That reference is **not** stored in `tree_history_events`/`tree_history_snapshots`.
Those tables stay premium-gated with `TREE_HISTORY_RETENTION_DAYS` retention; this
spike introduces a second, short-lived table so that giving every user atomic
delete capture does not silently extend 30-day retention (and its storage cost) to
every free-user delete. The two paths share persistence code, not storage or
retention policy.

## Current lifecycle map

| Stage | Client | Server |
|---|---|---|
| Capture | [`useRemoveMutation`](../../apps/web-app/src/features/nodes/client/tree/mutations/use-remove-node.ts) calls [`fetchFullSubtree(id, { includeCollapsedDescendants: true })`](../../apps/web-app/src/features/nodes/client/tree/fetch-full-subtree.ts) **before** the delete request, walking `visibleTree` pages to completion | [`deleteNode`](../../apps/web-app/src/features/nodes/server/procedures/delete-node.ts) captures a subtree snapshot via `captureSubtree`/`captureRestoreTarget` **only when the user has a premium seat** (`history.enabled`) |
| Delete | [`rawDelete`](../../apps/web-app/src/features/nodes/client/tree/mutations/delete-restore.ts) awaits `playRowExit`, optimistically patches the cache with `removeSubtree`, then calls `client.nodes.delete` | Recursive-CTE delete under `pg_advisory_xact_lock`; records a `subtree_deleted` tree-history event (premium only) |
| Undo registration | `useRemoveMutation` pushes `{ undo: rawRestore(snapshot), redo: rawDelete(id, silent) }` onto [`undoStore`](../../apps/web-app/src/features/nodes/client/undo/undo-store.ts) **after `rawDelete` resolves**, regardless of whether it actually succeeded | — |
| Undo (restore) | `rawRestore` optimistically reinserts via `insertSubtreeAt`, marks the row `flash`-restored, then calls `client.nodes.restore` with the **client-built** `root`/`descendants`/`target` (shaped by `toRestoreInput` from the row snapshot captured at delete time) | [`restoreNode`](../../apps/web-app/src/features/nodes/server/procedures/restore-node.ts) validates the parent exists, computes an order via `orderAtTarget`, and calls [`restoreSubtree`](../../apps/web-app/src/features/nodes/server/persistence/subtree-restore.ts) with the client-supplied ids/content — **no ID-collision check** |
| Redo | `rawDelete(id, { silent: true })`, reusing the **same** `UndoableAction` closure pushed once at capture time | same delete path |
| Motion | [`row-lifecycle.ts`](../../packages/outliner/src/tree/motion/row-lifecycle.ts)'s `playRowExit`/`markRowRestored` gate/mark presentation only | — |

### Confirmed defect (named in #535 and #536)

`rawDelete` catches the remote failure, shows an error toast, invalidates the
query, and **still resolves normally**:

```ts
try {
	const { childrenDeleted } = await client.nodes.delete({ id });
	...
} catch {
	toast.error(m.node_delete_failed());
	queryClient.invalidateQueries({ queryKey });
}
```

`useRemoveMutation` therefore always reaches `undoStore.push(...)` after awaiting
`rawDelete`, including when the server never deleted the node. Undo is then
usable for a deletion that did not happen — violating "undo is usable only after
successful deletion."

### A second, related defect this design surfaces

[`undo-store.ts`](../../apps/web-app/src/features/nodes/client/undo/undo-store.ts)
does not re-push on undo/redo — `undo()`/`redo()` move the **same**
`UndoableAction` object between stacks and call its closures again:

```ts
function undo() {
	const action = undoStack.at(-1);
	...
	redoStack = [...redoStack, action];
	action.undo();
}
```

Today this is safe only because the closure's captured `row`/`descendants`/`target`
snapshot is reusable by id indefinitely — deleting and restoring the same
already-known content repeatedly needs no fresh data. An opaque, single-use
deletion reference breaks this the moment a receipt is consumed: after
undo→redo→undo, the second undo must restore from the reference **produced by
redo's fresh delete**, not the one captured at the original delete. §"Rapid
undo/redo" below specifies the fix this seam requires; it is scoped entirely to
the deletion command's own closures and does not change `undoStore`'s contract.

### What already works and should be preserved

- `restoreSubtree` ([source](../../apps/web-app/src/features/nodes/server/persistence/subtree-restore.ts))
  is already the single persistence primitive for reinserting a captured
  subtree with original ids — both `restoreNode` and
  [`restoreTreeHistoryEntry`](../../apps/web-app/src/features/tree-history/server/tree-history-procedures.ts)'s
  `subtree_deleted` branch call it. This spike keeps that sharing and extends it.
- `captureSubtree`/`captureRestoreTarget`
  ([source](../../apps/web-app/src/features/tree-history/server/history-persistence.ts))
  already do a full recursive-CTE walk independent of client-visible/collapsed
  state — the right shape for atomic, collapse-independent capture. They are
  gated by premium status today; this design ungates the *capture*, not the
  *durable tree-history write*.
- `restoreTreeHistoryEntry`'s `subtree_deleted` branch already has the
  behaviors `restoreNode` is missing: an ID-collision check before restore, and
  a graceful parent/anchor fallback (`existingParentOrRoot`, target-or-append)
  instead of a hard error. This design generalizes that behavior to the
  undo/redo path instead of leaving two divergent implementations.

## Design 1: visible-tree-owned deletion (chosen)

`remove`/`restore` are `TreeCommand` variants inside #536's internal change
module, exactly as that spike assumed. Deletion gets one additional private
port, constructed the same way as #536's `TreeRemote`:

```ts
// Internal to apps/web-app; not exported from packages/outliner or the
// feature boundary. Constructor dependency of the change module, same as
// TreeRemote/TreeViewStore/TreeMotion/TreeHistory in #536.
interface DeletionReceipt {
	readonly deletionId: string;
	readonly nodeId: string;
}

interface RestoredRoot {
	id: string;
	parentId: string | null;
	content: unknown;
	type: NodeTypeName;
	metadata: NodeMetadata | null;
	expanded: boolean;
	order: string;
	dueDate: string | null;
	recurrence: RecurrenceRule | null;
	tags: string[];
	hasChildren: boolean;
}

interface NodeDeletionRemote {
	/**
	 * Atomically captures the full subtree (collapsed/unloaded descendants
	 * included) and deletes it in one transaction. The client never receives
	 * subtree contents; it only receives a reference and a count for toast copy.
	 */
	remove(nodeId: string): Promise<{
		receipt: DeletionReceipt;
		childrenDeleted: number;
	}>;

	/**
	 * Rehydrates from the server-held snapshot behind `receipt`. The server
	 * recomputes placement against current siblings (same fallback
	 * `restoreTreeHistoryEntry` already uses for `subtree_deleted`), so the
	 * client supplies no target. Throws a typed, stable error for an expired,
	 * already-consumed, or cross-user receipt, or an id collision.
	 */
	restore(receipt: DeletionReceipt): Promise<RestoredRoot>;
}
```

`TreeCommand`'s `remove`/`restore` variants (from #536) keep their existing
shape; `restore`'s `deletion: DeletionReceipt` payload is this interface's
receipt instead of the client-built snapshot #536 left unresolved.

### Why an opaque reference, not a subtree receipt

The client currently does two full-subtree round trips per delete: one fetch
before delete (`fetchFullSubtree` with `includeCollapsedDescendants`), one
upload on restore (`toRestoreInput`, serializing every descendant's content,
tags, due date, recurrence). Both go away. Reasons, weighed against the
required invariants:

- **Atomic capture.** The current pre-delete client fetch is a separate round
  trip from the delete transaction — nothing prevents another concurrent
  operation from mutating the subtree between fetch and delete. Capturing
  inside `deleteNode`'s own transaction (already how `captureSubtree` works for
  premium users) is the only way to make capture actually atomic with deletion,
  as the issue requires.
- **Collapsed/unloaded descendants never depend on the visible projection.**
  `captureSubtree`'s recursive CTE already doesn't consult client-visible rows;
  making it unconditional (not gated on premium) is a strict improvement over a
  client walk that depends on `visibleTree` pagination succeeding.
- **Payload size.** Subtrees can be large enough that `deleteNode` already
  distinguishes a ">64 children" toast; shipping full content both directions
  scales with subtree size on every delete. An opaque id is constant-size
  regardless of subtree size.
- **Restore correctness.** The client-supplied `target` in today's
  `toRestoreInput` is captured once, client-side, at delete time and never
  revalidated; `restoreNode` trusts it and has no ID-collision check. Recomputing
  placement server-side at restore time (like `restoreTreeHistoryEntry` already
  does) is strictly more correct for "explicit missing-parent/anchor behavior."

### Retention: a receipt table, not tree history

Ungating `captureSubtree` for every delete and writing the result into
`tree_history_snapshots` would answer "yes" to the issue's question ("can
existing tree history snapshots supply leverage") in the wrong way — it
would give every free-user delete `TREE_HISTORY_RETENTION_DAYS` (30-day
default) storage, a policy that today is deliberately premium-gated
([`createHistoryRecorder`](../../apps/web-app/src/features/tree-history/server/history-persistence.ts)
checks `premiumSeats` before writing anything).

Instead: a new `node_deletion_receipts` table, written unconditionally by
`deleteNode`, with its own short TTL independent of `TREE_HISTORY_RETENTION_DAYS`:

```ts
// server/persistence/node-deletion-table.ts (new)
export const nodeDeletionReceipts = pgTable(
	"node_deletion_receipts",
	{
		id: text().primaryKey().default(sql`gen_random_uuid()`),
		userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
		rootId: text("root_id").notNull(),
		parentId: text("parent_id"),
		order: text().notNull(),
		snapshot: jsonb().notNull().$type<CapturedHistoryNode[]>(), // reuses captureSubtree's row shape
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
		consumedAt: timestamp("consumed_at", { withTimezone: true }),
	},
	(t) => [index("node_deletion_receipts_user_created_idx").on(t.userId, t.createdAt)],
);
```

- **TTL**: a new `NODE_DELETION_RECEIPT_TTL_MINUTES` env var (proposed default
  1440 / 24h), validated the same way as `TREE_HISTORY_RETENTION_DAYS` in
  [`env.ts`](../../apps/web-app/src/env.ts). Long enough to cover realistic
  "left the tab, came back" undo, short enough that per-delete storage (now
  paid by every user, not just premium) stays bounded. A periodic purge job
  mirroring [`purge-tree-history.ts`](../../apps/web-app/src/features/tree-history/server/purge-tree-history.ts)
  hard-deletes expired/consumed rows.
- **Consumption**: `restore` sets `consumedAt` inside the same transaction that
  calls `restoreSubtree`. A second restore attempt against a consumed or expired
  `deletionId` fails with a stable typed error instead of hitting a raw unique
  constraint — the same class of error `restoreTreeHistoryEntry`'s collision
  check already produces for its own path.
- **User isolation**: every lookup is scoped by `userId`, same pattern as every
  other node query in this codebase.
- **Sharing with tree history**: for premium users, the same `captureSubtree`
  call inside `deleteNode`'s transaction is written to *both* tables — the new
  receipt table (always, short TTL) and `tree_history_snapshots` (premium only,
  30-day TTL, for the history UI). One capture, two writes when premium; one
  capture, one write otherwise. Code is shared (`captureSubtree`); storage and
  retention are not.

### Rapid undo/redo and the mutable-receipt fix

Because `undoStore` reuses the same pushed `UndoableAction` indefinitely (see
the second defect above), the deletion command's undo/redo closures must close
over a **mutable** cell rather than a fixed receipt:

```ts
function registerDeletionUndo(nodeId: string, receipt: DeletionReceipt) {
	const current = { receipt };
	undoStore.push({
		undo: () => execute({ kind: "restore", deletion: current.receipt }),
		redo: () =>
			execute({ kind: "remove", id: nodeId }).then((outcome) => {
				if (outcome.status === "succeeded") current.receipt = outcome.receipt;
			}),
	});
}
```

`redo` re-enters `execute()` for the original `remove` command — which,
per #536's protocol step 12 ("register history only after semantic success"),
is also where this same registration happens on the very first delete. Undo and
redo therefore always operate on the freshest receipt without `undoStore` itself
needing to know deletion has this constraint; it is private to this command's
implementation.

### Motion ordering

Today's `rawDelete` awaits `playRowExit` before removing the row from cache and
*before* issuing the remote call — the network request is gated behind an
animation finishing. Under this design that gating is unnecessary: since the
server no longer depends on a client pre-fetch, the remote `remove()` call can
be issued as soon as the optimistic cache patch runs, concurrently with exit
motion, with motion isolated per #536's `Promise.resolve(...).catch(reportMotionFailure)`
pattern. A slow or failed animation can no longer add latency to the actual
delete.

## Design 2: dedicated `NodeDeletionLifecycle` seam (rejected)

```ts
// Would be exported from apps/web-app's feature boundary (or packages/outliner,
// if it were made framework-agnostic) as a second public interface alongside
// VisibleTree.
interface NodeDeletionLifecycle {
	remove(nodeId: string): Promise<DeletionOutcome>;
	restore(receipt: DeletionReceipt): Promise<RestoreOutcome>;
	registerUndo(nodeId: string, receipt: DeletionReceipt): void;
}
```

The visible tree module would depend on this interface instead of an internal
port, and would supply it with projection/motion adapters (per the issue's
framing of option 2) rather than owning execution itself.

**Evaluated against the deletion test:** would removing this interface scatter
capture/persistence/restore/undo/motion/errors back into callers? For the
*production* code path, no — a `NodeDeletionRemote` port with a thin adapter
(Design 1) already concentrates all of that behind one boundary; wrapping it in
a second public interface adds indirection without adding a case that
interface serves and the internal port doesn't. The candidate reason to add
one — a *second real caller* needing deletion semantics through a shared
interface — doesn't hold up: `restoreTreeHistoryEntry` already reaches
`restoreSubtree`/`captureSubtree` directly at the persistence layer for its own
premium-history restore case, and will keep doing so; it does not and should
not go through a client-facing deletion interface, since it operates on
*existing* tree-history events, not on the live undo stack. So Design 2 would
have exactly one caller (the visible-tree module) for a second exported
surface — that fails the leverage bar #536 already applied to reject its own
"Design A" public command interface for the same reason.

**Where Design 2 would be justified:** if a second, independent caller emerged
that needed to trigger deletion-with-undo-receipt semantics without going
through `VisibleTree` at all (e.g., a bulk-delete command palette action, or an
API consumer outside the tree view). No such caller exists today, and #535/#536
list none. Revisit if one appears.

## Comparison

| Dimension | Design 1 (chosen) | Design 2 |
|---|---|---|
| Depth | High — atomic capture, receipt lifecycle, fallback placement, collision/expiry handling all live server-side and behind one port | Same server-side depth; adds a second client-facing interface on top |
| Locality | High — one `NodeDeletionRemote` port, symmetrical with #536's `TreeRemote` | Split across a new public interface and its own adapters, duplicating some of what `VisibleTreeChangeModule` already owns (undo registration, motion isolation) |
| Caller leverage | `VisibleTree.remove(id)` unchanged; internal `execute()` gains no new caller-facing shape | Every deletion caller (today, only the tree view) must go through the new interface instead of `VisibleTree` |
| Seam placement | Internal port, private to `apps/web-app`, no new export | New export from the feature boundary (or `packages/outliner`) |
| Deletion test | Passes: removing the port scatters capture/receipt/placement/collision logic back into `useRemoveMutation` and `restore-node.ts` directly | Would also pass in isolation, but the interface itself doesn't earn its *additional* seam — its one caller is already served by Design 1 |
| Migration risk | Slots directly into #536's already-specified `TreeCommand`/`TreeRemote` shape | Requires a parallel facade beside `VisibleTree`, mirroring the rejected #536 "Design A" trade-off |

**Choice: Design 1.** It satisfies every required invariant without adding a
second public interface, and it is exactly the shape #536 already assumed
("the change module depends only on an internal delete/restore port").

## Deletion test verdict

Removing `NodeDeletionRemote` and its production/receipt persistence would
scatter: atomic subtree capture, collapsed/unloaded descendant handling,
placement fallback, ID-collision and expiry errors, and receipt-consumption
idempotency — all back into `useRemoveMutation`, `delete-restore.ts`, and
`restore-node.ts` directly, which is precisely today's state and precisely what
produced the confirmed undo-after-failure defect. The port earns its seam.

## Private seams and adapters

| Internal interface | Production adapter | Test adapter |
|---|---|---|
| `NodeDeletionRemote` | oRPC calls to `deleteNode` (returns `{ receipt, childrenDeleted }`) and a receipt-based `restoreNode` (returns `RestoredRoot`, recomputing placement server-side) | Deterministic in-memory receipt store: a `Map<deletionId, { userId, snapshot, consumedAt }>` with an injectable clock for TTL/expiry tests |

This is the only new adapter pair; `TreeRemote`, `TreeViewStore`, `TreeMotion`,
and `TreeHistory` from #536 are unchanged and `remove`/`restore` commands simply
route through `NodeDeletionRemote` as their remote step.

### Server-side persistence sharing

Extract one helper, used by both the receipt-based `restoreNode` and
`restoreTreeHistoryEntry`'s `subtree_deleted` branch, so the ID-collision check
and parent/anchor fallback that today only exist in the tree-history path cover
both:

```ts
// server/persistence/subtree-restore.ts (extended)
async function restoreCapturedSubtreeWithFallback(
	transaction: NodeTransaction,
	userId: string,
	captured: { root: CapturedHistoryNode; descendants: CapturedHistoryNode[] },
	location: { parentId: string | null; target: HistoryRestoreTarget },
): Promise<RestoredRoot>; // throws a stable NOT_RESTORABLE-style error on collision
```

`restoreNode`'s handler and `restoreTreeHistoryEntry`'s `subtree_deleted` case
both call this instead of duplicating the collision check and
`existingParentOrRoot`/target-or-append fallback that currently lives only in
`tree-history-procedures.ts`.

## Interface-level tests

Constructed against the in-memory `NodeDeletionRemote`, exercised through
`VisibleTreeChangeModule.execute()` per #536's harness:

| Area | Required cases |
|---|---|
| Collapsed subtrees | `remove()` captures descendants regardless of client `expanded` state — the fake never reads client-visible rows, only its own seeded tree |
| Failure repair | Remote `remove()` rejects → no history entry registered, no receipt left consumable, optimistic removal is repaired by authoritative refresh (regression test for the confirmed defect) |
| Immediate undo | `execute({ kind: "restore", deletion })` right after a successful `remove()` reinstates the row with `RestoredRoot`'s authoritative fields |
| Rapid undo/redo | Undo → redo → undo cycles use the mutable-receipt pattern above; the second undo restores from the receipt redo just produced, not the original one |
| Missing placement | Restoring when the captured parent/anchor no longer exists in the fake falls back to append and the outcome says so |
| Conflicts | Restoring the same `deletionId` twice (simulated duplicate call) fails the second time with a stable typed error; no duplicate insert |
| User isolation | A fake seeded with two users' receipts refuses cross-user `restore()` |
| Motion | A rejecting exit/flash motion fake still allows delete/restore semantic success, per #536's general motion isolation test |
| History ordering | Undo entry appears only after `remove()` resolves successfully — never on rejection |

## Server transaction and Postgres concurrency tests (handed to #540)

`#540` already lists overlapping subtree deletion/restore races, missing
parent/anchor stability, ID-collision/stale-restore errors, and user isolation
as "coordinate with #535." This is that coordination:

- Concurrent `remove()` calls where one targets an ancestor of the other's
  target: advisory lock (`lockNodeOrdering`) serializes them; the second
  delete of an already-gone subtree returns `childrenDeleted: 0` without error
  (existing behavior in `deleteNode`'s `if (!root) return ...` — needs an
  explicit test, not just incidental coverage).
- Two concurrent `restore()` calls against the same `deletionId`: exactly one
  succeeds, the other gets the stable "already consumed" error, no unique
  constraint leaks to the caller.
- `restore()` where the captured parent no longer exists: falls back per
  `restoreCapturedSubtreeWithFallback`'s documented behavior (append), not a
  hard error — mirrors `restoreTreeHistoryEntry`'s existing
  `existingParentOrRoot` test gap for the plain-undo path.
- `restore()` where the captured anchor sibling was itself moved or deleted:
  same graceful target-or-append fallback, tested explicitly (today's
  `restore-node.ts` throws `INVALID_MOVE` here instead — this design changes
  that to match the tree-history path, so the behavior change itself needs a
  test).
- `restore()` against an expired receipt (past `NODE_DELETION_RECEIPT_TTL_MINUTES`):
  stable typed error, not a silent no-op.
- `restore()` where the node id already exists (collision): stable typed
  error from the shared collision check, for both the receipt path and the
  tree-history path.
- Every `node_deletion_receipts` read/restore is scoped to the authenticated
  user; a receipt id from user A is unreachable for user B even with a
  guessed id.
- DFS pagination (`visibleTree`) has no gaps or duplicate ids across a
  delete → restore cycle, extending the existing coverage in
  [`node-procedures.db.test.ts`](../../apps/web-app/src/features/nodes/server/node-procedures.db.test.ts).

None of this is implemented here; #540 owns writing it.

## Incremental migration

1. **Ungate atomic capture.** In `deleteNode`, call `captureSubtree`/
   `captureRestoreTarget` unconditionally (not gated on `history.enabled`);
   keep the tree-history write itself premium-gated. Add the
   `node_deletion_receipts` table, its TTL env var, and a purge job.
2. **Return a receipt, not nothing.** `deleteNode` returns
   `{ receipt: { deletionId, nodeId }, childrenDeleted }`.
3. **Extract shared restore persistence.** Add
   `restoreCapturedSubtreeWithFallback` to `subtree-restore.ts`; migrate
   `restoreTreeHistoryEntry`'s `subtree_deleted` branch onto it with no
   behavior change (it already has the collision check and fallback).
4. **Switch `restoreNode` to receipt input.** Replace its client-supplied
   `root`/`descendants`/`target` input with `{ deletionId }`; call the new
   shared helper; mark the receipt consumed in the same transaction. Drop
   `restoreNodeInputSchema`'s root/descendants shape once nothing calls it —
   this is a pre-release internal API with one caller, so this is a
   replacement, not a versioned migration.
5. **Client: drop the pre-delete fetch.** Remove `fetchFullSubtree`'s
   `includeCollapsedDescendants` call site from `use-remove-node.ts` entirely
   (its other caller — filtered expansion in `useToggleMutation`, per #536's
   lifecycle map — is untouched). `makeRawDeleteRestore` calls the new
   `remove`/`restore` shapes and pushes undo only after `remove()` succeeds,
   using the mutable-receipt pattern for redo.
6. **Integrate into #536's command module (#537's scope).** Move `remove`/
   `restore` into `TreeCommand` variants backed by `NodeDeletionRemote`;
   history registration happens once, in `execute()`'s step 12, closing the
   original defect structurally rather than by convention.
7. **#540 adds the concurrency/placement/collision/expiry/isolation tests**
   listed above, against the receipt-based `restoreNode` and the shared
   persistence helper.
8. **Cleanup.** Remove `DeleteSnapshot`/`toSnapshotInput`/`toRestoreInput` from
   `delete-restore.ts` once the receipt path is the only path.

Client pre-delete subtree fetching **goes away** under this design — it is
replaced by nothing, since the server captures atomically inside the delete
transaction instead.

## How this plugs into #536

This design changes none of #536's conclusions. `VisibleTree` stays the only
external interface; `VisibleTreeChangeModule` stays internal; `remove`/`restore`
stay `TreeCommand` variants executed through the same journal, structural
per-tree queue, and motion isolation #536 already specified. The only addition
is one more constructor dependency — `NodeDeletionRemote` — sitting where
#536 already reserved room for "an internal delete/restore port." No change to
`VisibleTree`'s type, no second public interface, no change to the operation
journal's shape: `PendingChange.project` for a `remove` command still just
calls `removeSubtree`/`insertSubtreeAt` on the row array; only the *data behind*
the `restore` command's payload changed, from a client-built snapshot to an
opaque reference.

## Source index

- [`use-remove-node.ts`](../../apps/web-app/src/features/nodes/client/tree/mutations/use-remove-node.ts)
- [`delete-restore.ts`](../../apps/web-app/src/features/nodes/client/tree/mutations/delete-restore.ts)
- [`fetch-full-subtree.ts`](../../apps/web-app/src/features/nodes/client/tree/fetch-full-subtree.ts)
- [`use-create-node.ts`](../../apps/web-app/src/features/nodes/client/tree/mutations/use-create-node.ts) (shares `makeRawDeleteRestore` for its own undo/redo)
- [`use-move-node.ts`](../../apps/web-app/src/features/nodes/client/tree/mutations/use-move-node.ts) (comparison point for undo/redo timing)
- [`undo-store.ts`](../../apps/web-app/src/features/nodes/client/undo/undo-store.ts)
- [`subtree-snapshot.schema.ts`](../../apps/web-app/src/features/nodes/model/subtree-snapshot.schema.ts)
- [`delete-node.ts`](../../apps/web-app/src/features/nodes/server/procedures/delete-node.ts)
- [`restore-node.ts`](../../apps/web-app/src/features/nodes/server/procedures/restore-node.ts)
- [`subtree-restore.ts`](../../apps/web-app/src/features/nodes/server/persistence/subtree-restore.ts)
- [`sibling-order.ts`](../../apps/web-app/src/features/nodes/server/persistence/sibling-order.ts)
- [`row-lifecycle.ts`](../../packages/outliner/src/tree/motion/row-lifecycle.ts)
- [`history-persistence.ts`](../../apps/web-app/src/features/tree-history/server/history-persistence.ts)
- [`tree-history-procedures.ts`](../../apps/web-app/src/features/tree-history/server/tree-history-procedures.ts)
- [`tree-history-table.ts`](../../apps/web-app/src/features/tree-history/server/tree-history-table.ts)
- [`tree-history.schema.ts`](../../apps/web-app/src/features/tree-history/model/tree-history.schema.ts)
- [`purge-tree-history.ts`](../../apps/web-app/src/features/tree-history/server/purge-tree-history.ts)
- [`env.ts`](../../apps/web-app/src/env.ts)
- [`node-procedures.db.test.ts`](../../apps/web-app/src/features/nodes/server/node-procedures.db.test.ts)
- [#536 design doc](./536-visible-tree-change-orchestration.md)
