# 08 — What v1 already taught us

This branch (`website/v2`) is a rebuild: it removes roughly 72,000 lines of the
application that lives on `main` and starts again from a minimal outliner
component. That earlier version is not a failed experiment — it is a working
outliner with a real database, a virtualized tree, a Lexical editor, drag and
drop, boards, filters, recurring due dates, an accessibility suite and a
performance harness.

So the useful question for v2 is not "what should we build", it is **"which of
v1's decisions were right, and which ones were the reason a rebuild looked
attractive"**. This document answers that from the code on `main`, and every
recommendation elsewhere in this directory should be read against it.

## 1. Keep these — v1 got them right

| v1 decision | Where | Why it stands |
|---|---|---|
| Adjacency list with a fractional `order` column | `nodes.parentId`, `nodes.order` | Exactly the model argued for in [02 §1](./02-data-model.md#1-choosing-a-tree-representation) — one row per move |
| `order` declared as `text COLLATE "C"` | `node-tables.ts`'s `collatedText` | Subtle and important: under a locale collation, fractional index keys do **not** sort the way the generator assumes. This is the kind of detail that is expensive to discover late |
| One advisory lock per user around ordering | `lockNodeOrdering()` | `pg_advisory_xact_lock(hashtext('nodes'), hashtext(userId))`. v2 widens the same idea to a workspace and gets monotonic log sequencing from it ([02 §8](./02-data-model.md#8-the-operation-log)) |
| Recursive-CTE ancestor check before a move | `move-node.ts` → `destinationAncestors()` | Correct cycle prevention, in the right place — inside the locked transaction |
| `SELECT … FOR UPDATE` on the moved node and the anchor sibling | `sibling-order.ts` | Prevents two concurrent moves from computing keys against a stale neighbour |
| A headless outliner package with no data-fetching | `packages/outliner` | Consumers pass data and callbacks. This is why the package survived the rebuild's motivation at all |
| Editing surface: static rows, Lexical on the focused row | `editor/lexical/edit/…`, `node-editor.tsx` | Independently arrives at the recommendation in [04 §5](./04-frontend-architecture.md#5-the-editing-surface) |
| Virtualized rows with a real perf harness | `tree/components/virtual-tree.tsx`, `e2e-perf/` | Benchmarks for query, mutation, filter and a combined workflow, with seeded 20k-node trees and base-vs-head comparison in CI. Rebuild this early; it is what keeps §12's budgets honest |
| Calendar dates stored as `date`, not a timestamp | `nodes.dueDate` | "A calendar date, not an instant" — the comment is right, and the bug it avoids is real |
| Accessibility enforced in CI | `.github/workflows/a11y.yml` | axe-core over the tree view and dialogs, failing on critical/serious |

The perf harness and the a11y suite are the two things most likely to be
dropped in a rewrite "for now" and most expensive to re-add later. They should
land in M1, not M5.

## 2. The structural problem: no operation vocabulary

v1 has roughly **seventeen** node mutation procedures — `create-node`,
`move-node`, `update-node-content`, `set-node-due-date`, `set-node-icon`,
`set-node-priority`, `set-node-recurrence`, `set-node-status`, `set-node-tags`,
`set-node-type`, `set-task-completed`, `set-node-board-view`, `toggle-node-expanded`,
`duplicate-node`, `delete-node`, `restore-node` — and a matching client hook for
each under `features/nodes/client/tree/mutations/`.

Every one of them independently implements: input validation, the authorization
check, the optimistic cache update, the rollback, the history recording, and the
undo entry. Adding one feature means touching all six concerns in a new file
that looks almost, but not exactly, like the last one.

That is the cost the rest of this directory is designed to remove. In v2 the
same seventeen features are combinations of **twelve operations**
([03 §1](./03-operations-and-sync.md#1-the-vocabulary)) — most of them are just
`node.setAttribute` with a different namespace — and the six concerns are
implemented once each, in the pipeline rather than in the feature.

Three v1 symptoms trace directly back to this:

**Undo is a stack of closures.** `undo-store.ts` holds
`{ undo: () => void; redo: () => void }` pairs pushed by each mutation hook. It
works, and it cannot be made to work for anything more: closures do not survive
a reload, cannot be rebased when someone else edits the same node, cannot be
inspected, and cannot be tested without invoking the mutation that created them.
Undo over an operation log is a pure function of data
([03 §8](./03-operations-and-sync.md#8-undo)).

**History is stored as before/after row snapshots.** `tree_history_events` plus
`tree_history_snapshots` copy every affected node's full state twice per event,
which is why there is a `db:purge-tree-history` job for anything older than 30
days. An operation log stores the *change*, is smaller by orders of magnitude,
and doubles as the sync substrate — one mechanism instead of two.

**Optimistic updates are per hook.** Each mutation hook patches the TanStack
Query cache in its own way (`cache-helpers.ts`, `raw-tree-ops.ts`). With one
`apply()` used for both the optimistic and the authoritative path, client and
server cannot disagree about what a mutation means, because they run the same
function ([01 §2](./01-principles.md#2-pure-core-impure-edges)).

## 3. Feature columns on the node table

`nodes` has accumulated `dueDate`, `dueTime`, `recurrence`, `icon`, `priority`,
`statusId`, `isBoard`, plus a type-scoped `metadata` blob. The code comments
defend this well — priority is top-level "because `metadata` is type-scoped to
`task` and any node type can carry a priority" — and within v1's design that
reasoning is correct.

The problem is the trend line: every feature is a column, a migration, a
procedure, a hook, and an entry in the snapshot table (which must also be
migrated). Nineteen migrations in, the schema encodes the product's feature list.

v2's answer is not "put it all in `metadata`" — that just moves the coupling and
loses the indexes. It is the **node-kind registry**
([06 §3](./06-extensibility.md#3-node-kinds)): namespaced, schema-validated
attributes with a GIN index for the common queries, and an explicit, reviewed
promotion to a real column when one namespace's queries become hot. The
difference is that promotion is then an optimization, not the only way to ship a
feature.

Related: v1's `statuses` table is scoped per board with a nullable `boardId` kept
only for rows created before that scoping existed. That is a healthy instinct —
never rewrite historical rows to fit a new model — and it is the same policy
[06 §7](./06-extensibility.md#7-versioning-and-data-migration) prescribes for
extension data.

## 4. Three schema choices to revisit in v2

**`expanded` lives on the node row.** It is per node, not per user. Single-user
v1 does not notice; the first shared outline does, immediately, and by then
every client caches it as node state. v2 puts it in `node_view_state`
([02 §2](./02-data-model.md#per-user-view-state)) from the start. This is the
single most expensive thing to retrofit on the list.

**`unique(userId, parentId, order)` with `nullsNotDistinct`.** A unique
constraint on the fractional index is why v1's move path has to recompute keys
when a collision occurs, and it is a hard failure for two writers inserting at
the same position — which is exactly what offline sync and collaboration
produce. v2 drops the constraint, adds jitter to key generation, and makes
`(order, id)` the total order
([02 §3](./02-data-model.md#3-sibling-ordering)). Convergence matters; key
uniqueness does not.

**`parentId` with `onDelete: cascade`, restore via snapshots.** Deleting is
destructive and undo depends on the snapshot tables being intact. Trash-as-move
([02 §7](./02-data-model.md#7-deletion-is-a-move)) makes delete, restore and
undo the same code path as move, and keeps `on delete restrict` as a guard
against a stray `DELETE` taking a subtree with it.

Two more, lower stakes:

- **Ownership is `userId` on every node.** Fine today; v2 uses `workspace_id`
  with a membership table so sharing is a permission change rather than a data
  migration of every row.
- **Search is `pg_trgm` over `searchText`.** A good fit for quick-open substring
  matching, and better than `tsvector` at prefix and typo tolerance. Keep it;
  add a `tsvector` column alongside only if ranked full-text results become a
  requirement. The two indexes answer different questions and can coexist.

## 5. What "extendable" would have meant in v1

Board view is the test case. In v1 it required: an `isBoard` column, a
`statuses` table with per-board scoping, a `statusId` FK, `set-node-board-view`
and five status procedures, a client mutation hook each, board components, and
drag-and-drop resolution — spread across the schema, the API, two packages and
the migration history.

Under v2's registries the same feature is a node kind (`cascade.board`) whose
attributes hold the column definitions, a projection that groups children by
status, a slot contribution for the board surface, and commands for the moves —
all of it in one directory, with no core change and no migration
([06 §9](./06-extensibility.md#9-worked-example-the-todo-extension) shows the
shape on a smaller feature).

That is the claim this architecture has to justify. If a future feature cannot
be built that way, the registry set is missing an extension point, and the
answer is to add one deliberately — not to reach past it into the core.

## 6. Carry these forward on day one

Not architecture, but they are what made v1 trustworthy, and rebuilds routinely
lose them:

- `CLAUDE.md` at the repo root, describing packages, commands and testing
  conventions.
- Database-backed tests (`*.db.test.ts` against a real Postgres) alongside pure
  unit tests. The tree logic in v2 is mostly pure and testable without a
  database — but the mutation pipeline, the advisory lock and the log sequencing
  are exactly the things a mocked database will not catch.
- The perf harness, with seeded 20k-node trees in `balanced`/`wide`/`deep`
  shapes and a fixed random seed so base-vs-head comparisons are meaningful.
- The a11y workflow.
- CI gates that already exist on this branch: Biome, typecheck, PR title, linked
  issue.
