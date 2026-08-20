# 04 — Front-end architecture

## 1. Shape of the client

```
                    ┌──────────────────────────────────────────┐
   keyboard  ─────► │  input layer                              │
   pointer   ─────► │  (keymap → command id, DOM events)        │
   clipboard ─────► └───────────────┬──────────────────────────┘
                                    ▼
                    ┌──────────────────────────────────────────┐
                    │  command registry                        │
                    │  run(ctx) → Transaction                  │
                    └───────────────┬──────────────────────────┘
                                    ▼
                    ┌──────────────────────────────────────────┐
                    │  document store  (@cascade/outliner)     │
                    │  confirmed state + pending queue          │
                    │  apply() from @cascade/core               │
                    └──────┬───────────────────────┬───────────┘
                           ▼                       ▼
              ┌─────────────────────┐   ┌────────────────────────┐
              │ projections         │   │ sync client            │
              │ visibleRows, search,│   │ push/pull, rebase      │
              │ backlinks, counts   │   └────────────────────────┘
              └──────────┬──────────┘
                         ▼
              ┌─────────────────────┐
              │ view (@cascade/ui)  │  virtualized rows, one live editor
              └─────────────────────┘
```

Every arrow points one way. There is no path from the view back into the store
that does not go through a command.

## 2. The store

Requirements, in tension: 100k nodes must load without jank; a keystroke must
re-render exactly one row; structural changes must invalidate only the affected
subtree; and React 19 concurrent rendering must never observe a torn state.

React state does not satisfy these. Use an **external store** read through
`useSyncExternalStore`, with per-node subscriptions.

```ts
// packages/outliner/src/store.ts
export interface TreeState {
	readonly nodes: ReadonlyMap<NodeId, Node>;
	readonly childrenOf: ReadonlyMap<NodeId, readonly NodeId[]>; // kept sorted
	readonly rootId: NodeId;
	readonly version: number; // bumped on every committed transaction
}

export interface DocumentStore {
	getSnapshot(): TreeState;
	subscribeNode(id: NodeId, listener: () => void): () => void;
	subscribeStructure(parentId: NodeId, listener: () => void): () => void;
	dispatch(tx: Transaction): Result<void, ApplyError>;
}
```

- `childrenOf` is maintained sorted on write, so no read path ever sorts. An
  insert is a binary-search splice.
- `touched` from `ApplyOutcome` ([03 §2](./03-operations-and-sync.md#2-applying-operations))
  drives which listeners fire. A content edit notifies one node's listeners; a
  move notifies the two affected parents' structure listeners.
- Snapshots are immutable and structurally shared, so `useSyncExternalStore`
  gets a stable identity per node and concurrent rendering is safe.

Hooks stay narrow:

```ts
const node = useNode(nodeId);          // re-renders only when this node changes
const rows = useVisibleRows();          // re-renders only on structural change
const isSelected = useIsSelected(nodeId);
```

**Do not** expose a `useDocument()` that returns the whole tree. It is the one
API that makes every optimization elsewhere pointless, and once it exists
someone will use it in a leaf component.

## 3. Where TanStack Query fits

The app already depends on TanStack Query, and it stays — for everything that is
*not* the outline: workspace list, user settings, share links, search results
that are server-computed.

The outline itself is not a query result. It is a synchronized replica with its
own consistency rules; wrapping it in a cache with `staleTime` would put two
invalidation systems in charge of the same data. Use Query to fetch the initial
snapshot and hand it to the store; after that, the store owns it.

(If we later adopt [TanStack DB](https://tanstack.com/db/latest/docs/overview),
it replaces the store's pending-queue plumbing while keeping this boundary: DB
collections for the outline, Query for everything else.)

## 4. The visible-row projection

The single most important derived value. It converts the tree into what the
screen shows: a flat, ordered list of rows.

```ts
export interface Row {
	readonly nodeId: NodeId;
	readonly depth: number;
	readonly hasChildren: boolean;
	readonly isExpanded: boolean;
	readonly mirrorPath: readonly NodeId[]; // non-empty when rendered via a mirror
}

export function visibleRows(state: TreeState, view: ViewState): readonly Row[];
```

Performance rules:

- **Recompute only on structural change.** Typing changes `content`, not the row
  list. Gate the projection on a `structureVersion` counter bumped by
  create/move/delete/collapse only. This alone is the difference between smooth
  typing and 40ms keystrokes in a large document.
- **Recompute incrementally above a few thousand rows.** Keep per-parent
  cached spans and rebuild only the affected range. Do the simple full rebuild
  first; add the incremental path when a profile says so, behind the same
  function signature.
- **Collapsed subtrees are not walked.** The traversal skips to the next sibling,
  so a 100k-node document with a collapsed root is 1 row of work.
- **Mirrors expand here**, carrying `mirrorPath` for cycle detection and for
  keying: the same node can legitimately appear twice on screen, so the React key
  must be the path, not the node id.

## 5. The editing surface

The central decision, and the one that is expensive to change later.

| Approach | Multi-row selection, copy, paste | Virtualization | Cost |
|---|---|---|---|
| One `contenteditable` per row | Hand-built; the browser gives nothing across rows | Natural | 10k editor instances; per-row IME and undo quirks |
| One ProseMirror doc for the whole tree | Free and correct | Effectively impossible — the doc must be fully rendered | Position ↔ node-id mapping in a plugin; large dependency |
| **Static rows, one live editor on the focused row** | Hand-built, but only once | Natural | Mount/unmount on focus change must be seamless |

**Decision: the third.** Non-focused rows render as plain, non-editable React
output from the inline model — fast, virtualizable, trivially memoized. The
focused row mounts a real editor (a small ProseMirror instance, or a single
`contenteditable` with a controlled inline model) bound to that node.

What this demands, and what must therefore be built deliberately:

1. **Seamless focus transfer.** Clicking a row must place the caret at the
   clicked character. Measure the click position against the static render
   before mounting the editor, then set the caret from the resolved offset — do
   not mount and hope.
2. **Never unmount the focused row.** If virtualization scrolls it out of the
   window, the editor unmounts, focus is lost and IME state dies. The virtualizer
   must always include the focused row in the rendered range, even when
   off-screen.
3. **Composition safety.** While an IME composition is active
   (`compositionstart` → `compositionend`), the row must not be re-rendered from
   the store and remote updates to that node must be deferred. Skipping this
   produces the classic "Japanese/Korean input drops characters" bug.
4. **A row-level selection model** for everything the browser would otherwise
   give us for free.

Escape hatch: if row-level selection and clipboard turn out to be more work than
expected, the fallback is a ProseMirror document scoped to the *rendered window*
rather than the whole tree. Do not start there — the mapping complexity is real
and only pays off if multi-row rich editing becomes central.

## 6. Selection

```ts
export type Selection =
	| { kind: "none" }
	| { kind: "text"; nodeId: NodeId; anchor: number; head: number }
	| { kind: "rows"; anchorId: NodeId; headId: NodeId }; // inclusive range in visible order
```

- Shift+Click, Shift+Arrow and drag produce `rows`. The range is resolved
  against `visibleRows`, so it is always contiguous on screen.
- A `rows` selection **implies its descendants**: selecting a collapsed parent
  selects the subtree. Operations expand a row selection into the set of
  *top-most* selected nodes before emitting, so moving a parent and its child
  does not double-move the child. This normalization lives in `@cascade/core`
  and is unit tested; it is where naive implementations corrupt trees.
- The selection lives in the store (as view state, never synced) so commands can
  read it, projections can highlight it, and it can be restored after undo via
  `SelectionEffect`.

## 7. Commands and keybindings

Keys map to command **ids**, not handlers. This is what makes the layer
inspectable, remappable, testable, and extensible.

```ts
export interface Command<A = void> {
	readonly id: CommandId;               // "outline.indent"
	readonly title: string;               // shown in the command palette
	readonly when?: ContextExpr;          // "editorFocused && !isFirstChild"
	run(ctx: CommandContext, args: A): Transaction | null;
}

export interface Keybinding {
	readonly key: string;                 // "Mod+Shift+ArrowUp"
	readonly command: CommandId;
	readonly when?: ContextExpr;
}
```

- `when` is evaluated against a typed context object (focus location, selection
  kind, node kind, platform). Same idea as VS Code's `when` clauses, and same
  payoff: conflicts are resolved by specificity instead of by handler ordering.
- `Mod` normalizes to Cmd on macOS and Ctrl elsewhere, in one place.
- Commands return a transaction; the store dispatches it. A command that
  performs its own side effects is a bug — it will not be replayable and cannot
  be tested without a DOM.
- The command palette, the context menu and the keyboard layer all read the same
  registry, so a new command appears in all three by existing.

Baseline keymap (each one command):

| Key | Command |
|---|---|
| Enter | `outline.splitOrCreateSibling` |
| Shift+Enter | `outline.insertLineBreak` (or open note, configurable) |
| Tab / Shift+Tab | `outline.indent` / `outline.outdent` |
| Backspace at offset 0 | `outline.mergeWithPrevious` |
| Mod+Shift+Up/Down | `outline.moveUp` / `outline.moveDown` |
| Mod+. / Mod+, | `outline.toggleCollapse` / `outline.zoomOut` |
| Mod+Enter | `outline.zoomIn` |
| Mod+K | `palette.open` |
| Mod+Z / Mod+Shift+Z | `history.undo` / `history.redo` |

## 8. Virtualization

`@tanstack/react-virtual` over the flat `Row[]`, with dynamic measurement
because rows wrap.

Pitfalls that must be handled, not discovered:

- **The focused row is always rendered** (§5).
- **Overscan generously** (10–20 rows). Cheap, and it hides measurement jitter
  during fast scrolling.
- **Do not virtualize small documents.** Below ~200 visible rows the virtualizer
  costs more than it saves and breaks native browser find-in-page. Switch on a
  threshold.
- **Find-in-page is broken** by virtualization at any size, so the in-app search
  (Mod+F) must be good enough to replace it, including scroll-to-match and
  expand-ancestors-of-match.
- **Depth indentation must not be a nested DOM structure.** Rows are siblings in
  a flat list with `padding-left: depth * step`. The current
  `Outliner.Children` component nests a `<div>` per level; that has to change
  when virtualization lands, because a flat list cannot contain nested rows.
- **Guide lines** (the vertical lines showing hierarchy) are drawn with a
  repeating background on the row rather than real elements, otherwise deep rows
  cost a DOM node per level.

## 9. Clipboard

The clipboard is a public data format; treat it as one.

On copy, write three flavours:

| MIME | Content |
|---|---|
| `application/x-cascade-nodes+json` | Full fidelity: subtree with kinds, attributes, inline marks. Used for in-app paste |
| `text/plain` | Tab-indented plain text — the format every other outliner accepts |
| `text/html` | Nested `<ul>/<li>` — for pasting into documents and email |

On paste, in priority order: our JSON (regenerating ids so pasting into the
same document does not collide), then HTML lists, then plain text parsed by
leading tabs/spaces into a tree. Every branch produces a normal transaction of
`node.create` operations, which is what makes paste undoable in one keypress.

Paste is also the most common source of malformed input from outside the system,
so it goes through the same parser as any other boundary
([05 §6](./05-type-safety.md#6-boundaries-and-parsing)).

## 10. Routing and zoom

The zoom root is URL state. TanStack Router gives typed params and validated
search params, so this is a place to spend a little rigour:

```ts
export const Route = createFileRoute("/w/$workspaceId/n/$nodeId")({
	params: {
		parse: (raw) => ({
			workspaceId: parseWorkspaceId(raw.workspaceId),
			nodeId: parseNodeId(raw.nodeId),
		}),
		stringify: (p) => ({ workspaceId: p.workspaceId, nodeId: p.nodeId }),
	},
	validateSearch: zodValidator(searchParamsSchema), // filters, q, view
	loader: ({ params, context }) => context.outline.ensureSnapshot(params),
	component: OutlinePage,
});
```

Zooming is navigation, so the back button works, links are shareable, and the
breadcrumb is derived from the ancestor chain. Do not implement zoom as local
state with a manual history push.

## 11. Accessibility

An outliner maps naturally onto the tree pattern, with one honest compromise:
`role="treeitem"` expects the item to be the focus target, while we put focus
inside an editor within the row.

The workable arrangement:

- Container `role="tree"`, rows `role="treeitem"` with `aria-level`,
  `aria-expanded`, `aria-setsize`, `aria-posinset`.
- Rows are `tabIndex={-1}` with roving focus; the editable region inside the
  focused row is what actually holds DOM focus.
- Structural actions announce themselves through a polite live region
  ("Indented. Now child of Groceries."), because a screen reader has no other
  way to perceive a re-parent.
- Bullet, collapse toggle and row menu are real `<button>`s with labels, not
  `<span onClick>`. The current `Toggle` and `Bullet` components render `<span>`
  and will need this before the outliner is interactive.
- Virtualization breaks screen-reader "browse the whole list" navigation; the
  `aria-setsize` values must reflect the *logical* list, not the rendered slice.

## 12. Performance budgets

Numbers to hold the design to, measured with the profiler on a mid-range laptop:

| Scenario | Budget |
|---|---|
| Keystroke → paint in a 10k-node document | < 16 ms |
| Indent / outdent → paint | < 16 ms |
| Load and first paint of a 100k-node workspace (collapsed) | < 1 s |
| Expand a 5k-child node | < 100 ms |
| Local `apply` of any single operation | < 5 ms |
| Memory for 100k nodes | < 250 MB |

Instrument early: a development-only counter for renders per row and a marker
around `apply` catch regressions long before they are perceptible.

## 13. Testing

- **`@cascade/core` — unit tests, exhaustive.** Every conflict row in
  [03 §5](./03-operations-and-sync.md#5-conflicts-concretely), every caret
  effect, every selection normalization. These are pure functions; there is no
  excuse for gaps.
- **Property tests** on the tree engine: applying a random operation sequence
  then its inverses returns the original state; `visibleRows` never contains a
  node whose ancestor is collapsed; no operation sequence produces a cycle.
- **Store tests** in Node with a fake sync transport: optimistic apply, reject,
  rebase, reconnect.
- **Component tests** for the editing surface: focus transfer, IME composition,
  clipboard round-trip.
- **End-to-end**, few and slow: type, indent, reload, verify persistence; two
  browsers editing the same workspace.
