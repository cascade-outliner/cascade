# Visible tree change orchestration

**Issue:** [#536](https://github.com/cascade-outliner/cascade/issues/536)
**Deletion dependency:** [#535](https://github.com/cascade-outliner/cascade/issues/535)
**Date:** 2026-07-28
**Status:** Design only; no production behavior changed.

## Decision

Keep `VisibleTree` as the external interface and put one internal change module behind
its named methods. The module owns change ordering, optimistic projection, remote
execution, authoritative reconciliation, undo/redo, motion isolation, query-family
effects, and toast policy.

Do not export a second change interface from `packages/outliner`. That package keeps
the pure row algorithms and types; it remains unaware of TanStack Query, oRPC, undo,
toasts, and application policy.

The internal implementation uses a command vocabulary because undo/redo and tests
need to re-enter the same path, but callers continue to receive the existing
[`VisibleTree`](../../packages/outliner/src/tree/model/tree.types.ts) interface.

## Current lifecycle map

`useVisibleTree` composes one query and twelve hooks
([source](../../apps/web-app/src/features/nodes/client/tree/use-visible-tree.ts)).
Most optimistic hooks use
[`useOptimisticNodeMutation`](../../apps/web-app/src/features/nodes/client/tree/mutations/use-node-mutation.ts),
which cancels and patches one query key, then invalidates that key on error.

| Hook | Cache and rows | Undo | Motion | Remote | Reconciliation |
|---|---|---|---|---|---|
| `useToggleMutation` | Collapse with `collapseNode`; expansion fetches the complete subtree and uses `expandNode`; filtered expansion only patches `expanded` | No | Marks expansion reveal | `visibleTree`, then `toggleExpanded` | Active key invalidated on failure |
| `useMoveMutation` | Optimistic `moveSubtree`; optionally expands destination parent | Captures prior placement and pushes before success | No | `move`, optionally `toggleExpanded` | Active key invalidated on failure; no success refresh |
| `useRemoveMutation` | Fetches a complete subtree, plays exit, then `removeSubtree` | Pushes after `rawDelete` resolves | Awaited row exit | `delete`; undo uses `restore` | `rawDelete` catches failure and invalidates |
| `useCreateMutation` | Server-first, then `appendRow` or `insertRowAfter` using live cache | Pushes after success; inverse uses raw delete/restore | Marks row entering | `create` | Toast on failure |
| `useDuplicateMutation` | Server-first; fetches descendants when needed; `insertSubtreeAfter` | No | Marks root entering | `duplicate`, optionally `visibleTree` | Promise toast; no repair needed before cache write |
| `useUpdateContentMutation` | Optimistic `patchRow` | Pushes immediately | No | `updateContent` | Active key invalidated on failure; ancestor queries invalidated on success |
| `useSetTypeMutation` | Optimistic type/metadata patch; clears recurrence for text | No | No | `setType` | Active key invalidated on failure |
| `useSetDueDateMutation` | Optimistic due-date/recurrence patch | Pushes immediately | No | `setDueDate` | Active key on failure; every visible-tree variant on success |
| `useSetRecurrenceMutation` | Optimistic recurrence patch; resets recurring task completion | No | No | `setRecurrence` | Active key invalidated on failure |
| `useSetTagsMutation` | Optimistic `tags` patch | Pushes immediately | No | `setTags` | Active key on failure; existing-tags query on success |
| `useSetTaskCompletedMutation` | Optimistic completion or recurrence advance | No | No | `setTaskCompleted` | Active key on failure; every visible-tree variant on success |
| `useLoadMoreMutation` | Appends rows and replaces `nextCursor` | No | No | `visibleTree` | No error policy |

Sources:

- Mutation hooks:
  [`mutations/`](../../apps/web-app/src/features/nodes/client/tree/mutations/)
- Cache helpers:
  [`cache-helpers.ts`](../../apps/web-app/src/features/nodes/client/tree/cache-helpers.ts)
- Complete-subtree fetch:
  [`fetch-full-subtree.ts`](../../apps/web-app/src/features/nodes/client/tree/fetch-full-subtree.ts)
- Pure row operations:
  [`packages/outliner/src/tree/rows/`](../../packages/outliner/src/tree/rows/)
- Motion:
  [`packages/outliner/src/tree/motion/`](../../packages/outliner/src/tree/motion/)
- Undo:
  [`undo-store.ts`](../../apps/web-app/src/features/nodes/client/undo/undo-store.ts)

### Confirmed defects

1. **Failed deletion can register undo.** `rawDelete` catches the remote error and
   resolves after invalidating the query
   ([source](../../apps/web-app/src/features/nodes/client/tree/mutations/delete-restore.ts)).
   `useRemoveMutation` therefore proceeds to `undoStore.push`
   ([source](../../apps/web-app/src/features/nodes/client/tree/mutations/use-remove-node.ts)).
2. **Failed move can register undo.** `useMoveMutation` pushes history while
   `mutateAsync` is still pending
   ([source](../../apps/web-app/src/features/nodes/client/tree/mutations/use-move-node.ts)).
3. **Failure repair has no operation ownership.** Invalidating the active key is
   authoritative eventually, but a refetch can overwrite optimistic changes made
   after the failed operation. TanStack Query's documented optimistic-update
   protocol gives each mutation a rollback value, but a whole-snapshot rollback is
   also stale when mutations overlap
   ([official guide](https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates)).
4. **Load-more failure is silent.**
   [`useLoadMoreMutation`](../../apps/web-app/src/features/nodes/client/tree/mutations/use-load-more-nodes.ts)
   defines no error behavior.

### Pagination clarification

The current `nextCursor` is server-produced and retained separately from cached
rows. A client row's stale fractional `order` does not itself change the cursor sent
by `loadMore`. The real risk is membership across the loaded-window boundary:
after a structural mutation, the fixed cursor can now lie before or after moved,
created, restored, duplicated, or deleted rows. The next page can therefore overlap
or skip membership, and the current append path does not deduplicate.

Returning only the moved row's authoritative `order` cannot repair that boundary.
Structural success needs an authoritative loaded-window refresh (or a richer
server-provided window receipt). The initial design chooses refresh because it is
correct for every structural command and adds no mutation-specific receipt format.

## Design A: public command interface

```ts
type TreeChange =
	| { kind: "toggle"; id: string; expanded: boolean }
	| { kind: "move"; id: string; target: MoveTarget; expandParentId?: string }
	| { kind: "remove"; id: string }
	| { kind: "restore"; deletion: DeletionReceipt }
	| { kind: "create"; placement: CreatePlacement; options?: AddNodeOptions }
	| { kind: "duplicate"; id: string }
	| { kind: "updateContent"; id: string; content: SerializedContent }
	| { kind: "setType"; id: string; typed: TypedMetadata }
	| { kind: "setDueDate"; id: string; dueDate: Date | null }
	| { kind: "setRecurrence"; id: string; recurrence: RecurrenceInput | null }
	| { kind: "setTags"; id: string; tags: string[] }
	| { kind: "setTaskCompleted"; id: string; completed: boolean }
	| { kind: "loadMore" };

type ChangeResult<T> =
	| { ok: true; outcome: T }
	| { ok: false; error: ChangeError };

interface VisibleTreeChanges {
	execute(change: TreeChange): Promise<ChangeResult<ChangeOutcome>>;
}
```

**Ordering:** capture, optimistic projection, remote call, authoritative
reconciliation, history registration, external effects. Motion can surround the
projection but cannot alter the semantic result.

**Errors:** stable local validation errors are returned directly; remote errors
carry the command ID and cause. Callers do not rollback caches.

**Strength:** one small, high-leverage interface.

**Weakness:** it creates a second external interface beside `VisibleTree`. Callers
must translate existing named operations into commands or can bypass the existing
interface. That extra seam provides no correctness unavailable internally.

## Design B: compatibility-first internal change module

`VisibleTree` remains the external interface. `useVisibleTree` adapts its named
methods to a private command module:

```ts
type ChangeId = string;

type TreeCommand =
	| { kind: "move"; id: string; target: MoveTarget; expandParentId?: string }
	| { kind: "remove"; id: string }
	| { kind: "restore"; deletion: DeletionReceipt }
	| { kind: "create"; placement: CreatePlacement; options?: AddNodeOptions }
	// Remaining commands mirror Design A.
	;

interface ChangeOutcome {
	id: ChangeId;
	status: "succeeded" | "failed";
	error?: ChangeError;
}

interface VisibleTreeChangeModule {
	execute(
		command: TreeCommand,
		context?: { history: "record" | "undo" | "redo" | "none" },
	): Promise<ChangeOutcome>;
}
```

The module's interface is internal to `apps/web-app`. It is the test surface for
complete change paths. Individual phase callbacks are implementation details, not
interfaces exposed to hooks or tests.

### Internal operation journal

Each active tree view owns:

```ts
interface ViewState {
	base: VisibleTreeData;
	pending: PendingChange[];
	loadedPageCount: number;
}

interface PendingChange {
	id: ChangeId;
	command: TreeCommand;
	project(rows: VisibleNodeRow[]): VisibleNodeRow[];
}
```

The visible projection is always `pending.reduce(project, base.rows)`.

- Adding an optimistic operation appends it and republishes the projection.
- Success folds its authoritative result into `base`, removes it from `pending`,
  then replays remaining operations.
- Failure refreshes authoritative `base`, removes only the failed operation, then
  replays later pending operations.
- A whole cached snapshot is never restored over newer work.

This journal is the central answer to overlapping field edits. For repeated edits
to one field, pending projections replay in command order; an earlier failure
cannot overwrite the later value. Remote field writes are sequenced per
`nodeId + field` so server arrival order also matches semantic order. Independent
fields can execute concurrently.

Structural commands are serialized per visible tree from capture through
authoritative reconciliation. Their optimistic projections may be shown when they
reach the head of that queue. This avoids targets being interpreted against a
different structure than the one captured. It also gives undo/redo one stable
serialization point.

### Execution protocol

1. Validate the command against the latest projected rows.
2. Capture semantic inverse data and placement.
3. For structural commands, enter the per-tree queue.
4. Cancel in-flight reads for the active key.
5. Run presentation-before work. Catch and report motion errors internally; never
   convert them to semantic failure.
6. Append the optimistic operation and publish the projection.
7. Execute through the remote adapter.
8. On failure, refresh authoritative base and replay every other pending operation.
9. On success, reconcile authoritative fields and membership.
10. For structural success, refetch the same number of loaded pages from page one,
    replace `base.rows` and `nextCursor`, then replay pending field operations.
11. Run success invalidations for query families and related caches.
12. Register history only after semantic success.
13. Run presentation-after work with the same failure isolation.

`loadMore` joins the structural queue. It appends a page only when its request
cursor still equals the journal's current cursor and deduplicates IDs defensively.

Undo stores an inverse `TreeCommand`; redo stores the original command. Both call
`execute` with the appropriate history mode. They therefore traverse the same
validation, queue, remote adapter, reconciliation, motion, and error policy as the
original command.

### Motion ordering

Motion is presentation, not semantics. The initial migration preserves current
visual ordering: delete exit motion precedes the optimistic removal; entry markers
precede insertion where required. Every motion call is isolated with
`Promise.resolve(...).catch(reportMotionFailure)`. A motion exception cannot skip
the cache operation, remote call, reconciliation, or history decision.

### Query variants

The module distinguishes:

- the active view key, whose `rows`, `nextCursor`, and loaded-window size it owns;
- the visible-tree key family, invalidated when filters can change membership;
- related keys such as ancestors and existing tags.

Each command declares its success effects in the private command registry. Hooks
no longer remember query-family policy.

## Comparison

| Dimension | Design A | Design B |
|---|---|---|
| Depth | High | High |
| Locality | High | High; policy and journal live in one implementation |
| Caller leverage | New generic execute method | Existing named methods retain all leverage |
| Test leverage | Complete command path | Same complete command path through an internal interface |
| External seam | Adds `VisibleTreeChanges` | Keeps only `VisibleTree` |
| Migration risk | Requires a parallel facade | Hook-by-hook replacement behind stable behavior |
| Deletion compatibility | Command can be moved behind another seam | Same; command ownership remains private pending #535 |

**Choice: Design B.** Deleting this module would redistribute operation ownership,
concurrency, reconciliation, history, motion, and query-family policy across every
mutation hook. It therefore passes the deletion test and earns its seam.

A third named-method module would mostly duplicate `VisibleTree`; it adds interface
surface without greater leverage.

## Deletion test and dependency on #535

The current delete cluster fails the deletion test: removing
`useRemoveMutation`, `makeRawDeleteRestore`, and the client subtree snapshot logic
would scatter capture, projection, persistence, restore, undo, motion, and errors
back into callers.

Under Design B, delete and restore can both be commands and traverse the shared
implementation. This is the recommended working assumption.

Issue #535 owns the final decision between:

1. deletion remaining an internal command; and
2. an external `NodeDeletionLifecycle` interface supplying an opaque receipt.

This spike does **not** preselect that seam. The change module depends only on an
internal delete/restore port, so #535 can choose either adapter without changing
`VisibleTree` or the journal.

The current client-built subtree receipt is not endorsed as the final persistence
shape. Collapsed descendants and atomic capture are #535 concerns. If #535 chooses
an opaque server reference, the `DeletionReceipt` command payload becomes that
reference; if it chooses a subtree receipt, the same command shape holds the
receipt. Free-user retention, expiry, idempotency, and user isolation remain owned
by #535.

## Private seams and adapters

Only seams with two concrete adapters are retained:

| Internal interface | Production adapter | Test adapter |
|---|---|---|
| `TreeRemote` | oRPC client | Deterministic in-memory tree |
| `TreeViewStore` | TanStack `QueryClient` + active query metadata | In-memory base/pending journal |
| `TreeMotion` | Existing outliner motion functions | Recording/failing fake |
| `TreeHistory` | Existing `undoStore` | Recording history fake |

These interfaces are constructor dependencies of the internal module and are not
exported from the feature boundary. Toast text remains private policy driven by
outcomes; tests observe a recording notifier only where user feedback is part of
the behavior.

The remote adapter accepts semantic placement (`before`, `after`, or append under
a parent), never fractional order. The production adapter is responsible for oRPC
input/output translation.

## Interface-level tests

Tests construct the change module with in-memory adapters and call `execute`.
They do not invoke phase callbacks.

| Area | Required cases |
|---|---|
| Success | Optimistic projection precedes remote settlement; authoritative fields replace optimistic values; history appears only after success |
| Failure | Only the failed journal entry is removed; later optimistic edits remain; authoritative refresh repairs ambiguous state; no history entry |
| Field concurrency | Same-field writes reach remote in order; failed first write cannot overwrite the second projection; independent fields can overlap |
| Structural concurrency | Move/remove/create/restore/load-more serialize per tree; each command validates against the preceding reconciled structure |
| Undo/redo | Inverse and original commands re-enter `execute`; rapid undo/redo serialize; failed undo remains explicit and does not fabricate history |
| Motion | Before/after ordering is recorded; rejected motion still permits semantic success; reduced-motion/no-op adapter yields same semantic outcome |
| Filters | Due-date and recurring-completion success invalidate every visible-tree variant; active optimistic projection remains coherent until refresh |
| Pagination | Structural success refreshes the previously loaded window and cursor; load-more rejects stale responses and deduplicates overlap |
| Membership | Create, duplicate, move, remove, restore, expansion, and collapse reconcile authoritative row membership |
| Errors | Load-more failure is surfaced without advancing cursor; stable validation and remote failures produce typed outcomes |

Thin hook tests remain only to prove `useVisibleTree` wires every named method to
the right command and republishes query data.

## Pure tests that remain in `packages/outliner`

The following behavior remains framework-agnostic and continues to be tested at
the pure row interface:

- depth-first and subtree-contiguous row operations;
- `depth`, `path`, `parentId`, `hasChildren`, `expanded`, and `isLastChild`;
- collapse/expand, insert/remove, move targets, placement capture, and ARIA sibling
  metadata;
- row lifecycle and expansion-reveal marker behavior.

Primary suites:

- [`visible-rows.test.ts`](../../packages/outliner/src/tree/rows/visible-rows.test.ts)
- [`row-lifecycle.test.ts`](../../packages/outliner/src/tree/motion/row-lifecycle.test.ts)
- [`expansion-reveal.test.ts`](../../packages/outliner/src/tree/motion/expansion-reveal.test.ts)

Protocol assertions currently spread across
[`optimistic-mutations.test.tsx`](../../apps/web-app/src/features/nodes/client/tree/mutations/optimistic-mutations.test.tsx)
and `use-visible-tree` tests move to the change-module interface. Existing hook
tests for row shapes become a small wiring smoke suite rather than duplicate
orchestration tests.

Server transaction tests remain at the procedure interface, including move cycle
validation, DFS pagination, filter membership, delete cascade, restore conflicts,
and sibling-order locking
([suite](../../apps/web-app/src/features/nodes/server/node-procedures.db.test.ts)).

## Incremental migration

1. **Introduce the internal module and adapters.** Add the operation journal,
   field queues, structural queue, interface tests, and no production callers.
2. **Migrate field edits.** Move content, type, due date, recurrence, tags, and
   completion. Prove same-field overlap and cross-key success effects.
3. **Migrate move and pagination reconciliation.** Move placement and optional
   expansion become one structural command; refresh the loaded window after
   success; serialize `loadMore`.
4. **Integrate #535's deletion result.** Implement remove/restore through the
   chosen internal or external deletion adapter. Fix failed-delete history.
5. **Migrate create and duplicate.** Their undo/redo commands reuse the same
   remove/restore execution path.
6. **Migrate toggle and load-more.** Preserve filtered expansion behavior,
   complete-subtree loading, stale-response rejection, and cursor policy.
7. **Retire the hook cluster's protocol helpers.** Remove
   `useOptimisticNodeMutation`, raw delete/restore orchestration, and duplicated
   cache helpers after all methods use the module.

Every slice keeps the `VisibleTree` interface unchanged and retains pure row tests.

## Follow-up issue slices

1. [#542](https://github.com/cascade-outliner/cascade/issues/542) introduces
   the visible-tree change module, journal, and internal adapters.
2. [#541](https://github.com/cascade-outliner/cascade/issues/541) migrates
   field changes with overlap-safe reconciliation.
3. [#539](https://github.com/cascade-outliner/cascade/issues/539) migrates
   structural move and authoritative loaded-window pagination refresh.
4. [#537](https://github.com/cascade-outliner/cascade/issues/537) integrates
   the deletion lifecycle selected by #535.
5. [#538](https://github.com/cascade-outliner/cascade/issues/538) migrates
   create and duplicate through shared undo/redo commands.
6. [#543](https://github.com/cascade-outliner/cascade/issues/543) migrates
   toggle/load-more and retires the old orchestration helpers.
7. [#540](https://github.com/cascade-outliner/cascade/issues/540) adds missing
   server concurrency and restore-placement tests required by #535 and
   structural reconciliation.

## Source index

- [`use-visible-tree.ts`](../../apps/web-app/src/features/nodes/client/tree/use-visible-tree.ts)
- [`mutations/`](../../apps/web-app/src/features/nodes/client/tree/mutations/)
- [`visible-tree-query.ts`](../../apps/web-app/src/features/nodes/client/tree/visible-tree-query.ts)
- [`tree-data.types.ts`](../../apps/web-app/src/features/nodes/client/tree/tree-data.types.ts)
- [`fetch-full-subtree.ts`](../../apps/web-app/src/features/nodes/client/tree/fetch-full-subtree.ts)
- [`undo-store.ts`](../../apps/web-app/src/features/nodes/client/undo/undo-store.ts)
- [`packages/outliner/src/tree/rows/`](../../packages/outliner/src/tree/rows/)
- [`packages/outliner/src/tree/motion/`](../../packages/outliner/src/tree/motion/)
- [`sibling-order.ts`](../../apps/web-app/src/features/nodes/server/persistence/sibling-order.ts)
- [`move-node.ts`](../../apps/web-app/src/features/nodes/server/procedures/move-node.ts)
- [`visible-tree.ts`](../../apps/web-app/src/features/nodes/server/procedures/visible-tree.ts)
- [`delete-node.ts`](../../apps/web-app/src/features/nodes/server/procedures/delete-node.ts)
- [`restore-node.ts`](../../apps/web-app/src/features/nodes/server/procedures/restore-node.ts)
- [TanStack Query optimistic updates](https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates)
