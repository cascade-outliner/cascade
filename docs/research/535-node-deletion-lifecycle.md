# Node deletion lifecycle

**Issue:** [#535](https://github.com/cascade-outliner/cascade/issues/535)
**Orchestration dependency:** [#536](https://github.com/cascade-outliner/cascade/issues/536)
**Date:** 2026-07-28
**Status:** Design only; no production behavior changed.

## Decision

Node deletion gets its own external seam, `NodeDeletionLifecycle`, separate from the
visible-tree change module. The visible tree (whether that stays the current hook
cluster or becomes the module #536 designs) consumes it through a small port and
supplies row projection and motion around it. `NodeDeletionLifecycle` owns capture,
delete, restore, receipts, and their errors; it owns no `VisibleNodeRow`, no
TanStack Query cache, and no motion.

This is the opposite call from #536's own conclusion (which kept `VisibleTree` as
the *only* external interface and pushed everything internal). Deletion earns a
separate seam because its hardest invariants are almost entirely server-transaction
and data-shape concerns — atomic capture, collision handling, receipt expiry, user
isolation — that have nothing to do with row projection, and because three call
sites already need the same delete/restore behavior today with no row projection in
common:

1. `useRemoveMutation`'s undo (delete → restore, full subtree, collapsed
   descendants included);
2. `useCreateMutation` / `useDuplicateMutation`'s undo (a freshly created node is
   undone by deleting it, redone by restoring it, zero descendants); and
3. `restoreTreeHistoryEntry`'s `subtree_deleted` branch (tree-history's own restore
   path, gated on premium, already duplicating most of `restore-node.ts`'s logic).

A fourth (bulk/keyboard multi-delete) doesn't exist yet, but the same reasoning
would apply to it without changing the interface.

## Current lifecycle map

| Stage | Owner today | Notes |
|---|---|---|
| Capture | Client: `fetchFullSubtree(id, { includeCollapsedDescendants: true })` in `useRemoveMutation`, run *before* the delete request | Not atomic with the delete — a separate, unlocked `visibleTree` read. Server-side atomic capture (`captureSubtree`/`captureRestoreTarget` in `delete-node.ts`) only runs when `history.enabled`, i.e. premium seats only |
| Delete | Client: `rawDelete` in `delete-restore.ts` → `client.nodes.delete({ id })` → server `deleteNode` (`delete-node.ts`) | Server delete is a single recursive-CTE `DELETE ... RETURNING count`, correctly idempotent (missing id → `{ childrenDeleted: 0 }`, no error) |
| Snapshot shaping | Client: `toSnapshotInput`/`toRestoreInput` in `delete-restore.ts`, built from `VisibleNodeRow` | Reconstructs a persistence-shaped payload from presentation state; must stay in sync with `subtree-snapshot.schema.ts` by hand |
| Restore | Client: `rawRestore` → `client.nodes.restore(...)` → server `restoreNode` (`restore-node.ts`) → `restoreSubtree` persistence helper | Duplicates target-resolution/collision logic that `restoreTreeHistoryEntry`'s `subtree_deleted` branch (`tree-history-procedures.ts`) also implements independently, against the *same* `restoreSubtree` helper |
| Undo/redo registration | Client: `undoStore.push` in `useRemoveMutation`/`useCreateMutation`, `undoStore.undo`/`redo` (`undo-store.ts`) | `undo`/`redo` are fire-and-forget (not awaited) |
| Motion | Client: `playRowExit`/`markRowRestored` (`packages/outliner/src/tree/motion/row-lifecycle.ts`), awaited *before* the delete request starts | Sequential: total latency is `motionDuration + serverRoundTrip` |
| Errors | Client: `rawDelete`/`rawRestore` catch, toast, `invalidateQueries` | See defect below |

Sources:

- Client: [`use-remove-node.ts`](../../apps/web-app/src/features/nodes/client/tree/mutations/use-remove-node.ts), [`delete-restore.ts`](../../apps/web-app/src/features/nodes/client/tree/mutations/delete-restore.ts), [`fetch-full-subtree.ts`](../../apps/web-app/src/features/nodes/client/tree/fetch-full-subtree.ts), [`use-create-node.ts`](../../apps/web-app/src/features/nodes/client/tree/mutations/use-create-node.ts), [`undo-store.ts`](../../apps/web-app/src/features/nodes/client/undo/undo-store.ts)
- Model: [`subtree-snapshot.schema.ts`](../../apps/web-app/src/features/nodes/model/subtree-snapshot.schema.ts)
- Server: [`delete-node.ts`](../../apps/web-app/src/features/nodes/server/procedures/delete-node.ts), [`restore-node.ts`](../../apps/web-app/src/features/nodes/server/procedures/restore-node.ts), [`subtree-restore.ts`](../../apps/web-app/src/features/nodes/server/persistence/subtree-restore.ts), [`history-persistence.ts`](../../apps/web-app/src/features/tree-history/server/history-persistence.ts), [`tree-history-procedures.ts`](../../apps/web-app/src/features/tree-history/server/tree-history-procedures.ts)
- Motion: [`row-lifecycle.ts`](../../packages/outliner/src/tree/motion/row-lifecycle.ts)

### Confirmed defects

1. **Failed deletion can still register undo.** `rawDelete` catches the remote
   error internally (toast + `invalidateQueries`) and *resolves* rather than
   rejecting ([source](../../apps/web-app/src/features/nodes/client/tree/mutations/delete-restore.ts#L67-L91)).
   `useRemoveMutation` awaits `rawDelete(id)` and then unconditionally pushes undo
   ([source](../../apps/web-app/src/features/nodes/client/tree/mutations/use-remove-node.ts#L27-L31)).
   A deletion that failed on the server can therefore offer an undo that restores a
   node the server never actually deleted, racing the invalidation-triggered
   refetch.
2. **Free users get no atomic capture.** `deleteNode` only calls `captureSubtree`/
   `captureRestoreTarget` when `createHistoryRecorder` reports `enabled`, which
   requires a premium seat
   ([source](../../apps/web-app/src/features/nodes/server/procedures/delete-node.ts#L33-L44)).
   For everyone else, the *only* capture is the client's own pre-delete
   `fetchFullSubtree` call — a separate, non-transactional, non-locked read that
   races any concurrent structural change between the fetch and the delete, and
   that (unlike the server capture) has no `pg_advisory_xact_lock` protecting it.
   This directly violates the required invariant that "complete subtree and
   restore target are captured atomically with deletion" for the majority of
   users.
3. **Missing parent/anchor behavior is inconsistent between the two existing
   restore paths.** `restore-node.ts` throws hard `NOT_FOUND`/`INVALID_MOVE`
   errors if the target parent or anchor sibling no longer exists
   ([source](../../apps/web-app/src/features/nodes/server/procedures/restore-node.ts#L42-L56)).
   `restoreTreeHistoryEntry`'s `subtree_deleted` branch instead degrades
   gracefully — falls back to the tree root if the parent is gone, then to
   `{ position: "append" }` if the anchor sibling moved
   ([source](../../apps/web-app/src/features/tree-history/server/tree-history-procedures.ts#L383-L397)).
   The same logical operation (restore a deleted subtree) currently either hard-
   fails or silently repositions depending on which of the two procedures happens
   to run it.
4. **No explicit ID-collision handling on direct restore.** `restoreTreeHistoryEntry`
   pre-checks for existing rows with the snapshot's node ids and throws
   `NOT_RESTORABLE` before inserting
   ([source](../../apps/web-app/src/features/tree-history/server/tree-history-procedures.ts#L371-L381)).
   `restore-node.ts`/`restoreSubtree` has no equivalent check; a collision (however
   unlikely with UUIDs) would surface as a raw Postgres constraint violation
   instead of a stable typed error.
5. **`undo`/`redo` are fire-and-forget.** `undoStore.undo()`/`redo()`
   ([source](../../apps/web-app/src/features/nodes/client/undo/undo-store.ts#L25-L41))
   call `action.undo()`/`action.redo()` without awaiting the returned promise.
   Nothing prevents a second rapid undo/redo from starting before the first one's
   async restore/delete round trip has settled.
6. **Motion is on the critical path, not beside it.** `rawDelete` awaits
   `playRowExit(id)` in full before removing the row from cache or issuing the
   delete request
   ([source](../../apps/web-app/src/features/nodes/client/tree/mutations/delete-restore.ts#L67-L75)).
   The remote request has no dependency on the animation; today's ordering just
   adds the animation's duration to every delete's total latency.
7. **Direct restore and tree-history restore already share persistence, not
   policy.** Both `restore-node.ts` and `restoreTreeHistoryEntry`'s
   `subtree_deleted` branch call the same `restoreSubtree` persistence helper, but
   each independently reimplements target resolution, collision handling, and
   history recording around it — see defects 3 and 4. The shared primitive is
   already right; the wrapper logic around it isn't shared and has drifted.

## Interface designs

### Design A: internal implementation of the visible tree change module

Deletion lives entirely inside whatever module #536 designs (or, absent that
module, inside `useRemoveMutation`/`makeRawDeleteRestore` as today). It has its own
private `TreeRemote`-style port for the delete/restore RPC calls, but no interface
distinct from the tree module's other structural commands (`move`, `create`, ...).

```ts
// Inside the (hypothetical) visible tree change module, private.
interface DeletionPort {
	delete(id: string): Promise<{ receiptId: string; childrenDeleted: number }>;
	restore(receiptId: string): Promise<RestoreResult>;
}

// remove/restore become ordinary TreeCommand variants (see #536's Design B):
type TreeCommand =
	| { kind: "remove"; id: string }
	| { kind: "restore"; receiptId: string }
	| /* ...other structural commands */;
```

**Strength:** zero new external surface; deletion's row-cache/motion/undo-timing
concerns are handled by the same journal, serial queue, and reconciliation logic
every other structural command uses, for free.

**Weakness:** create/duplicate's undo (defect-adjacent call site 2 above) and
tree-history's restore (call site 3) are *not* inside the visible tree change
module — they're separate callers that need the same delete/restore semantics.
Under Design A, either those two callers reach into the tree module's private
`DeletionPort` (breaking its privacy) or they keep their own parallel
implementation (the status quo's actual problem). Design A does not resolve defect
7 — it would still leave direct restore and tree-history restore as two
independent wrappers around one shared low-level helper.

### Design B: dedicated `NodeDeletionLifecycle` seam (chosen)

```ts
export type DeletionOutcome =
	| { ok: true; receiptId: string; childrenDeleted: number }
	| { ok: false; error: DeletionError };

export type RestoreOutcome =
	| {
			ok: true;
			node: RestoredNode;
			descendantCount: number;
			placement: "exact" | "fallback-root" | "fallback-append";
	  }
	| { ok: false; error: RestoreError };

export type DeletionError =
	| { kind: "NOT_FOUND" } // id already gone; treated as a definite no-op, not a failure
	| { kind: "UNKNOWN"; cause: unknown }; // no response received — see "Idempotency" below

export type RestoreError =
	| { kind: "RECEIPT_NOT_FOUND" }
	| { kind: "RECEIPT_EXPIRED" }
	| { kind: "RECEIPT_CONSUMED" }
	| { kind: "ID_COLLISION"; nodeIds: string[] }
	| { kind: "UNKNOWN"; cause: unknown };

export interface NodeDeletionLifecycle {
	/** Deletes `id` and its subtree, capturing an atomic, short-lived receipt. */
	delete(id: string): Promise<DeletionOutcome>;
	/** Consumes a receipt exactly once, reinserting the subtree with original ids. */
	restore(receiptId: string): Promise<RestoreOutcome>;
}
```

`NodeDeletionLifecycle` is constructed once per app (like `undoStore`) and injected
into every caller that currently duplicates delete/restore orchestration:
`useRemoveMutation`, `useCreateMutation`/`useDuplicateMutation`'s undo, and (via a
thin server-side counterpart, not a client call) `restoreTreeHistoryEntry`'s
`subtree_deleted` branch. It owns:

- capture atomicity and the receipt's shape/retention (below);
- delete/restore's typed errors, including the missing-placement and
  ID-collision decisions (below) — one answer, used everywhere;
- nothing about `VisibleNodeRow`, TanStack Query, or motion. Callers still do
  `removeSubtree`/`insertSubtreeAt` themselves, exactly as `delete-restore.ts` does
  today, just fed by `NodeDeletionLifecycle` instead of raw oRPC calls and
  client-shaped snapshots.

Undo/redo stay outside the lifecycle too — `undoStore.push({ undo: () =>
lifecycle.restore(receiptId), redo: () => lifecycle.delete(id) })`, same pattern as
today, just backed by the receipt instead of a client-held snapshot.

## Comparison

| Dimension | Design A (internal) | Design B (dedicated seam) |
|---|---|---|
| Depth | Medium — deletion's hardest invariants (atomic capture, receipts, collisions) live behind a generic `TreeCommand`, diluted among unrelated commands | High — one small interface whose every method maps directly to a required invariant |
| Locality | Low for the two callers outside the tree module (create/duplicate undo, tree-history restore) — they still need their own path | High — every delete/restore caller, including tree-history, converges on one implementation |
| Leverage | Only the tree module benefits | Three existing call sites benefit today, a fourth (bulk delete) trivially later |
| Seam placement | Reuses #536's seam, whatever it ends up being | Independent of #536 landing; #536's module becomes just another caller |
| Deletion test | Removing it scatters capture/receipt/collision/placement logic back into the tree module *and* leaves the other two callers unaffected (they were never inside it) | Removing it scatters capture/receipt/collision/placement logic back into three independent callers — clearly fails the deletion test, i.e. it's pulling its weight |

**Choice: Design B.** The invariants this issue is actually about — atomic
capture, receipt retention, collision handling, consistent missing-placement
behavior, user isolation — are server-transaction and data-shape concerns with no
natural home inside a row-projection module, and three independent call sites
already need identical behavior today. Design A would have made #536's module
responsible for policy that two of those three callers can't reach.

This does not block on #536: `NodeDeletionLifecycle` has no dependency on the tree
module's existence, and whichever design #536 lands on (internal module or
otherwise) simply becomes one more consumer of this seam's `delete`/`restore`
methods, called from wherever `remove`/`restore` commands are validated and
sequenced today (a per-tree structural queue, if #536's Design B is what lands).

## Receipt shape: opaque reference, not a client-held subtree

**Decision: opaque server reference (`receiptId`), not a full subtree payload
returned to the client.**

- **Atomicity.** An opaque reference backed by a server-side capture in the same
  transaction as the delete (using the existing `captureSubtree`/
  `captureRestoreTarget` helpers, now run unconditionally instead of gated on
  `history.enabled`) trivially satisfies "collapsed/unloaded descendants never
  depend on the visible projection" and "captured atomically with deletion" — the
  client never has to see the descendants at all, so it can't race them.
- **Payload size.** A full subtree receipt would mean the client holds a
  potentially large in-memory undo-stack entry (thousands of nodes for a big
  subtree) for the life of the session. An opaque reference is a single string.
- **Free-user parity.** The premium `tree_history_events`/`tree_history_snapshots`
  tables stay premium-gated, 30-day retention, and queryable through the
  tree-history UI — that policy is out of scope here (non-goal: "folding general
  tree history read/restore policy into deletion"). The deletion receipt is a
  *different*, ungated, short-lived table so free users get the same atomic-undo
  guarantee without touching premium's retention/read-surface policy.

**Retention.** Receipts are not durable deletion storage — they exist to make
*immediate* undo/redo correct and atomic, not to be a trash bin. A fixed TTL on
the order of tens of minutes (long enough for realistic "oops, undo that" and
rapid undo/redo, short enough that it's obviously not a data-recovery feature) is
enough; expired, unconsumed receipts are purged by a scheduled job matching the
existing `db:purge-tree-history:app` pattern. This is deliberately **not** wired
to `TREE_HISTORY_RETENTION_DAYS` — that env var is premium tree-history's
single source of truth per CLAUDE.md, and coupling deletion-receipt TTL to it
would be exactly the "folding general tree history policy into deletion" this
issue's non-goals rule out.

**Reusing tree-history's capture code without coupling to premium history.** Yes:
`captureSubtree`/`captureRestoreTarget` are already pure functions taking a
transaction, not gated themselves — only their *caller* in `delete-node.ts` gates
on `history.enabled`. The lifecycle's `delete()` runs them once, unconditionally,
for the receipt; if the deleting user is premium, the *same* captured rows are
also written into `tree_history_snapshots` (no second SQL capture), keeping
today's premium history feature intact. Free users get the receipt only; premium
users get the receipt *and* durable history. Storage, gating, and retention stay
fully decoupled — only the capture SQL is shared.

## Missing parent/anchor and ID collisions

**Decision: adopt `restoreTreeHistoryEntry`'s graceful-degradation behavior
everywhere**, and make it observable: `restore()`'s success outcome reports
`placement: "exact" | "fallback-root" | "fallback-append"` so a caller can toast
"restored to top level" instead of silently repositioning a node the user expected
back exactly where it was. A hard `NOT_FOUND`/`INVALID_MOVE` throw (today's
`restore-node.ts` behavior) turns an otherwise-recoverable undo into a dead end;
degrade-and-report is strictly better UX for the same invariant ("missing
parent/anchor behavior is explicit and consistent") as long as it's reported, not
silent.

**Decision: pre-check ID collisions before insert**, mirroring
`restoreTreeHistoryEntry`'s existing check, and surface it as the stable
`ID_COLLISION` error rather than letting `restoreSubtree`'s insert hit a raw
constraint violation.

## Idempotency for ambiguous network failures

Three outcomes, not two:

1. **Definite success** — a response with a `receiptId` arrived. Undo may be
   registered.
2. **Definite failure** — a response arrived carrying a real error (validation,
   `NOT_FOUND`, etc). No receipt exists; no undo to offer.
3. **Unknown (`UNKNOWN`)** — no response arrived at all (timeout, offline, dropped
   connection). The server-side operation may have completed. This is the case
   defect 1 mishandles today by treating it as failure and letting undo through
   anyway.

`deleteNode` is already naturally idempotent for retries: deleting an id that's
already gone is a no-op success (`{ childrenDeleted: 0 }`,
[source](../../apps/web-app/src/features/nodes/server/procedures/delete-node.ts#L31)),
so a client-side retry after an `UNKNOWN` outcome is always safe to issue — but the
*lost* response's receipt (if the original request did succeed server-side) has no
way back to the client that never saw it. The lifecycle does not attempt to recover
that receipt speculatively. Instead: an `UNKNOWN` outcome never registers undo,
full stop — the required invariant is "fail explicitly," not "guess correctly."
The existing `invalidateQueries` reconciliation (unchanged) is what makes the
*visible tree* eventually consistent regardless of which of the three outcomes
actually happened; only *undo availability* is gated on a definite success.

Restore's `UNKNOWN` case is different: a lost restore response, followed by a
client retry against the *same* `receiptId`, hits `RECEIPT_CONSUMED` if the first
attempt actually succeeded (safe, stable, and exactly the redo-race case rapid
undo/redo already needs to handle — see below) or succeeds normally if it didn't.
No new mechanism needed beyond receipt consumption already being one-shot.

## Undo/redo serialization

`undoStore.undo`/`redo` become a single in-flight promise chain: popping from the
stack still happens synchronously (so button-disabled state reacts immediately),
but invoking `action.undo()`/`action.redo()` is queued behind whatever the
previous call is still awaiting. Combined with one-shot receipt consumption, a
rapid double-redo now has a well-defined outcome: the first queued call consumes
the receipt and succeeds; the second, now queued behind it, calls `restore()`
again on an already-consumed receipt and gets `RECEIPT_CONSUMED` — a stable,
explicit, non-corrupting error, not a race.

## Motion ordering

**Decision: start the remote `delete()` call concurrently with `playRowExit`,
not after it.** Nothing about issuing the request depends on the animation having
finished — the server captures/deletes synchronously regardless. The row still
only leaves the cache once motion finishes (so there's something mounted to
animate, preserving today's visual behavior), but total latency becomes
`max(motionDuration, serverRoundTrip)` instead of their sum. Motion failure
remains isolated exactly as it is today (`playRowExit`'s existing
try/catch-and-proceed): a rejected/cancelled animation cannot delay, skip, or fail
the delete request or the eventual cache removal.

## Private seams and adapters

| Interface | Production adapter | Test adapter |
|---|---|---|
| `NodeDeletionLifecycle` | oRPC client calling `nodes.delete` / `nodes.restoreFromDeletionReceipt` | Deterministic in-memory receipt store with configurable failure/latency injection, no network |

`NodeDeletionLifecycle` is the only client-facing export; its adapters are not
exported outside `apps/web-app`. Server-side, the lifecycle's capture/collision/
placement logic lives in `apps/web-app/src/features/nodes/server/persistence/`
alongside the existing `restoreSubtree` helper it wraps, so both the direct
`nodes.delete`/`nodes.restoreFromDeletionReceipt` procedures and
`restoreTreeHistoryEntry`'s `subtree_deleted` branch call the same wrapper instead
of each reimplementing target resolution and collision checks (resolving defect
7).

## Interface-level tests

| Area | Required cases |
|---|---|
| Collapsed subtrees | Deleting a node with collapsed/unloaded descendants captures all of them via the receipt with zero client-side pre-fetch |
| Failure repair | A definite delete failure produces no receipt and no undo entry; the visible tree's own row stays until an authoritative refetch confirms state |
| Immediate undo | Undo right after a successful delete restores the exact subtree, ids, content, tags, due dates, and recurrence intact |
| Rapid undo/redo | Delete → undo → redo → undo fired faster than any one call resolves executes serially with no corruption; the second of a racing double-redo gets `RECEIPT_CONSUMED` |
| Missing placement | Restoring after the original parent was deleted falls back to root; restoring after the anchor sibling moved falls back to append; both report their fallback in the outcome |
| Conflicts | Restoring a receipt whose node ids collide with existing nodes returns `ID_COLLISION` and inserts nothing |
| User isolation | User B calling `restore()` with user A's `receiptId` gets `RECEIPT_NOT_FOUND`, never a hint the receipt exists or belongs to someone else |
| Idempotency | A definite `NOT_FOUND` delete (id already gone) is a no-op success, not an error; an `UNKNOWN` outcome never registers undo |
| Expiry | Restoring an expired receipt returns `RECEIPT_EXPIRED`, distinct from `RECEIPT_NOT_FOUND` |
| Motion isolation | A rejected exit-motion promise does not delay, skip, or fail the delete call or the eventual cache removal; the remote call is observably issued before motion resolves |

## Server transaction and Postgres concurrency tests

| Case | Expectation |
|---|---|
| Concurrent `deleteNode` + `moveNode` on the same node | `lockNodeOrdering`'s advisory lock serializes them; the loser sees a consistent result, never a partial delete/move |
| Concurrent restore of the same receipt (two overlapping calls) | Exactly one succeeds; the other gets `RECEIPT_CONSUMED`; no duplicate nodes are ever created |
| Restore into a parent deleted after capture, before restore | Falls back to root per the missing-placement decision, reported in the outcome |
| Restore of an expired receipt | `RECEIPT_EXPIRED` |
| Cross-user receipt access | `RECEIPT_NOT_FOUND` for another user's receipt id, on every read and consume path |
| ID collision on restore | `ID_COLLISION`, no partial insert |
| Large subtree capture | Snapshot rows batch the same way `tree_history_snapshots` already does (`DUPLICATE_BATCH_SIZE`/`postgresBatchSize`), so a receipt for a subtree spanning multiple Postgres parameter batches still captures atomically |

## Incremental migration

1. **Server: receipts.** Add the `node_deletion_receipts` table and its purge job;
   make `deleteNode` always capture (reusing captured rows for premium's existing
   `tree_history_snapshots` write); add `restoreFromDeletionReceipt`; unify
   collision/placement handling behind the shared wrapper `restoreTreeHistoryEntry`
   also calls. (#547)
2. **Client: the lifecycle port.** Introduce `NodeDeletionLifecycle`, its
   production oRPC adapter, and an in-memory test adapter, with interface-level
   tests. No production caller uses it yet. (#548)
3. **Client: migrate callers.** `useRemoveMutation`, `useCreateMutation`,
   `useDuplicateMutation` move onto the lifecycle; delete `fetchFullSubtree`'s
   pre-delete walk, `toSnapshotInput`/`toRestoreInput`, and (once nothing calls it)
   the direct `nodes.restore` procedure and `subtree-snapshot.schema.ts`'s
   client-shaped restore input. Fix the undo-after-failure ordering defect as part
   of this move, since it's structurally impossible once undo registration is
   gated on the lifecycle's typed success outcome. (#549)
4. **Client: undo/redo serialization.** Independent of the above — queue
   `undoStore.undo`/`redo` execution. (#550)
5. **Client: motion concurrency.** Independent of the above — start the delete
   request alongside exit motion instead of after it. (#551)
6. **Tests: server concurrency.** Add the Postgres concurrency/isolation suite
   once #547's receipts exist to exercise. (#552)
7. **Integration with #536.** Once (if) #536's visible tree change module lands,
   its `remove`/`restore` commands call `NodeDeletionLifecycle` the same way
   `useRemoveMutation` does today — no new work on this side, since the lifecycle
   was designed with that caller in mind from the start.

Every slice keeps today's `VisibleTree`-equivalent caller surface unchanged;
`NodeDeletionLifecycle` is additive until slice 3 switches callers over.

## Follow-up issues

1. [#547](https://github.com/cascade-outliner/cascade/issues/547) — server:
   atomic, ungated deletion receipts.
2. [#548](https://github.com/cascade-outliner/cascade/issues/548) — client:
   `NodeDeletionLifecycle` port and adapters.
3. [#549](https://github.com/cascade-outliner/cascade/issues/549) — client:
   migrate delete/create/duplicate undo onto the lifecycle.
4. [#550](https://github.com/cascade-outliner/cascade/issues/550) — client:
   serialize undo/redo execution.
5. [#551](https://github.com/cascade-outliner/cascade/issues/551) — client: start
   delete concurrently with exit motion.
6. [#552](https://github.com/cascade-outliner/cascade/issues/552) — test: server
   concurrency and user-isolation coverage.

## Source index

- [`use-remove-node.ts`](../../apps/web-app/src/features/nodes/client/tree/mutations/use-remove-node.ts)
- [`delete-restore.ts`](../../apps/web-app/src/features/nodes/client/tree/mutations/delete-restore.ts)
- [`fetch-full-subtree.ts`](../../apps/web-app/src/features/nodes/client/tree/fetch-full-subtree.ts)
- [`use-create-node.ts`](../../apps/web-app/src/features/nodes/client/tree/mutations/use-create-node.ts)
- [`undo-store.ts`](../../apps/web-app/src/features/nodes/client/undo/undo-store.ts)
- [`subtree-snapshot.schema.ts`](../../apps/web-app/src/features/nodes/model/subtree-snapshot.schema.ts)
- [`delete-node.ts`](../../apps/web-app/src/features/nodes/server/procedures/delete-node.ts)
- [`restore-node.ts`](../../apps/web-app/src/features/nodes/server/procedures/restore-node.ts)
- [`subtree-restore.ts`](../../apps/web-app/src/features/nodes/server/persistence/subtree-restore.ts)
- [`history-persistence.ts`](../../apps/web-app/src/features/tree-history/server/history-persistence.ts)
- [`tree-history-procedures.ts`](../../apps/web-app/src/features/tree-history/server/tree-history-procedures.ts)
- [`tree-history-table.ts`](../../apps/web-app/src/features/tree-history/server/tree-history-table.ts)
- [`row-lifecycle.ts`](../../packages/outliner/src/tree/motion/row-lifecycle.ts)
- [`node-procedures.db.test.ts`](../../apps/web-app/src/features/nodes/server/node-procedures.db.test.ts)
