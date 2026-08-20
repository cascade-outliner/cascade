# 06 — Extensibility

## 1. What "extendable" has to mean here

Not "we will add a plugin API later". A plugin API bolted onto a finished
application exposes whatever internals happen to be reachable, and those
internals then cannot change.

Instead: **build the first-party features as extensions from day one**, against
the same registries a third party would use. Todos, dates, tags, backlinks, the
command palette — if those go through the extension surface, the surface is
proven, and there is no incentive to add a private back door.

The constraint that shapes everything: extensions participate in a system that
replays, inverts and synchronizes changes. Anything an extension does that
affects the document must therefore be **deterministic and expressible as
operations**. That single requirement rules out the usual `onChange(store)`
design and points at declarative contributions.

## 2. The extension surface

Seven extension points. Each is a typed registry; each is used by first-party
code.

| Point | Contributes | Runs on |
|---|---|---|
| Node kinds | A row type: attribute schema, renderer, behaviour | client |
| Commands | Named actions with `when` conditions and keybindings | client |
| Inline tokens | New inline content types and their parsers/renderers | client |
| Slots | UI injected at named positions in the row and shell | client |
| Projections | Pure folds over the document that derive an index | client |
| Operation validators | Rules that can reject or normalize an operation | **both** |
| Server jobs | Scheduled or triggered work (reminders, imports) | server |

```ts
export interface Extension {
	readonly id: ExtensionId;            // "cascade.todo" — namespaced, stable forever
	readonly version: string;            // semver, used for data migration
	readonly nodeKinds?: readonly NodeKindDefinition<string, unknown>[];
	readonly commands?: readonly Command[];
	readonly keybindings?: readonly Keybinding[];
	readonly inlineTokens?: readonly InlineTokenDefinition<string, unknown>[];
	readonly slots?: readonly SlotContribution[];
	readonly projections?: readonly ProjectionDefinition<unknown>[];
	readonly validators?: readonly OperationValidator[];
	readonly migrations?: readonly AttributeMigration[];
}
```

An extension is a **value**, not a class with lifecycle methods. It can be
inspected, listed, diffed and tested without being activated.

## 3. Node kinds

The core knows about `kind: string` and `attributes: jsonb`
([02 §2](./02-data-model.md#the-node-table)). Everything else about a row type
comes from its definition:

```ts
export interface NodeKindDefinition<K extends string, A> {
	readonly kind: K;                          // "cascade.todo"
	readonly attributes: z.ZodType<A>;
	readonly defaultAttributes: A;
	readonly canHaveChildren?: boolean;        // default true
	render(props: NodeRenderProps<A>): ReactNode;
	toPlainText?(node: Node, attrs: A): string;   // clipboard / export
	fromPlainText?(line: string): { attrs: A; content: Inline[] } | null; // paste / import
	readonly commands?: readonly Command[];
}
```

Two invariants make kinds safe to add and remove:

1. **Unknown kinds render as plain bullets, and keep their data.** A workspace
   opened without the todo extension shows the text; it does not lose the `done`
   flag, and re-enabling the extension restores full behaviour. This is enforced
   by the parser: unknown namespaces in `attributes` are preserved verbatim
   rather than stripped.
2. **A kind may not add columns.** If an extension's queries need indexed
   columns, that is a core schema migration with a review — not something an
   extension can do to the database. The `jsonb` GIN index covers the common
   cases ([02 §9](./02-data-model.md#9-queries-the-application-actually-runs)).

## 4. Inline tokens

`#tag`, `@mention` and `[[link]]` are not special cases in the parser; they are
registered inline kinds:

```ts
export interface InlineTokenDefinition<T extends string, D> {
	readonly type: T;
	readonly schema: z.ZodType<D>;
	/** Trigger character and a matcher run while typing. */
	readonly trigger?: { char: string; pattern: RegExp };
	render(data: D): ReactNode;
	toPlainText(data: D): string;
	/** Optional: contribute to a projection, e.g. tag index or backlinks. */
	readonly indexAs?: (data: D) => IndexEntry | null;
}
```

The editor asks the registry which triggers exist, so an extension that adds
`!priority` gets autocomplete, rendering, serialization and indexing from one
declaration. Unknown inline types round-trip untouched, for the same reason as
unknown kinds.

## 5. Slots

UI injection points, named and typed, so extensions never reach into the DOM:

```ts
export type SlotName =
	| "row.beforeBullet" | "row.afterBullet" | "row.afterContent" | "row.aside"
	| "row.contextMenu"  | "shell.sidebar"   | "shell.topBar"     | "shell.rightPanel"
	| "palette.section";

export interface SlotContribution<N extends SlotName = SlotName> {
	readonly slot: N;
	readonly id: string;
	readonly priority?: number;              // lower renders first; default 100
	readonly when?: (ctx: SlotContext<N>) => boolean;
	render(props: SlotProps<N>): ReactNode;
}
```

`SlotProps` is different per slot — `row.*` slots get the node and its resolved
attributes, `shell.*` slots get the workspace. The mapped type keeps this exact,
so a contribution to `shell.sidebar` cannot read `props.node`.

Row slots are on the hot path: they render inside the virtualized list, so a
contribution that is expensive costs frames. The host measures per-slot render
time in development and warns above a budget — cheaper than discovering it in a
user's profile.

## 6. Projections

The extensible answer to "how do I add backlinks / a tag index / a due-date
view" without touching the core.

A projection is a **pure fold over operations** with a rebuildable-from-scratch
guarantee:

```ts
export interface ProjectionDefinition<S> {
	readonly id: ProjectionId;
	readonly initial: S;
	reduce(state: S, op: Operation, doc: TreeState): S;   // must be pure
	/** Optional full rebuild, used on load and after a schema change. */
	rebuild?(doc: TreeState): S;
}
```

- The host runs every projection over each committed transaction, and can
  rebuild any projection at any time — so a bug in a projection is never a data
  bug, just a stale index.
- Projections are read through a hook (`useProjection(backlinks)`) and are
  memoized per document version.
- They are client-side by default. When one needs to be server-side (a saved
  search across a workspace too large to hold locally), the same `reduce`
  function runs in the mutation pipeline and writes to a table — the definition
  does not change, only where it is hosted.

First-party projections: backlinks, tag index, todo counts per subtree,
"recently edited", full-text index for local search.

## 7. Versioning and data migration

Extension data is namespaced and self-versioned:

```jsonc
// node.attributes
{
	"cascade.todo": { "v": 2, "done": true, "completedAt": "2026-08-19T10:00:00Z" },
	"acme.estimate": { "v": 1, "points": 3 }
}
```

```ts
export interface AttributeMigration {
	readonly namespace: string;
	readonly from: number;
	readonly to: number;
	migrate(value: Json): Json;   // pure
}
```

Migrations run **lazily on read** and are written back the next time the node is
edited. A bulk rewrite of every node is a workspace-wide operation flood that
would sync to every device; lazy migration spreads the cost and keeps old
clients working. The rules:

- Never mutate another extension's namespace.
- Never remove a namespace you do not own, including on parse failure — quarantine
  it in `attributes["$unparsed"]` and surface a warning instead.
- A namespace's meaning is fixed once it ships. New meaning, new namespace.

## 8. Operation validators

The only extension point that runs on both sides, and therefore the only one
with a hard determinism requirement:

```ts
export interface OperationValidator {
	readonly id: string;
	/** Return the (possibly rewritten) op, or a typed rejection. */
	validate(op: Operation, doc: TreeState, ctx: OpContext): Result<Operation, ApplyError>;
}
```

Used for: enforcing that a `cascade.todo` node cannot be moved under a completed
parent; normalizing a heading's attributes on kind change; blocking edits to a
locked subtree.

Constraints, non-negotiable:

- Pure, synchronous, no IO. It runs inside the workspace transaction.
- Same code on client and server. If a validator behaves differently in the two
  places, the client's optimistic state diverges from the server's and the user
  sees rows jump. Ship validators in a shared package; do not allow a
  client-only or server-only validator.
- Deterministic ordering: validators run in registration order, which is the
  order extensions were loaded, which is sorted by extension id. No priorities,
  because priorities become a negotiation.

## 9. Worked example: the todo extension

Everything above, exercised end to end. This is the acceptance test for the
extension API — if a feature this ordinary needs a core change, the API is
wrong.

```ts
// packages/extensions/src/todo/index.ts
import { defineExtension, defineNodeKind } from "@cascade/extensions";
import { z } from "zod";

const todoAttributes = z.object({
	v: z.literal(2),
	done: z.boolean(),
	completedAt: z.iso.datetime().nullable(),
	due: z.iso.date().nullable(),
});
type TodoAttributes = z.infer<typeof todoAttributes>;

const todoKind = defineNodeKind({
	kind: "cascade.todo",
	attributes: todoAttributes,
	defaultAttributes: { v: 2, done: false, completedAt: null, due: null },
	render: ({ node, attrs, emit }) => (
		<TodoRow
			checked={attrs.done}
			dimmed={attrs.done}
			onToggle={() => emit(toggleTodo(node.id, attrs))}
			content={node.content}
		/>
	),
	toPlainText: (node, attrs) => `${attrs.done ? "[x]" : "[ ]"} ${plainText(node.content)}`,
	fromPlainText: (line) => {
		const match = /^\[( |x)\]\s+(.*)$/.exec(line);
		if (!match) return null;
		return {
			attrs: { v: 2, done: match[1] === "x", completedAt: null, due: null },
			content: [{ type: "text", text: match[2] }],
		};
	},
});

// A transaction, not a mutation. Undo, sync and history come for free.
function toggleTodo(nodeId: NodeId, attrs: TodoAttributes, ctx: OpContext): Transaction {
	const done = !attrs.done;
	return transaction(ctx, [
		{
			kind: "node.setAttribute",
			nodeId,
			namespace: "cascade.todo",
			value: { ...attrs, done, completedAt: done ? ctx.now() : null },
		},
	]);
}

export const todoExtension = defineExtension({
	id: "cascade.todo",
	version: "2.0.0",
	nodeKinds: [todoKind],

	commands: [
		{
			id: "todo.toggle",
			title: "Toggle todo",
			when: "nodeKind == 'cascade.todo'",
			run: (ctx) => toggleTodo(ctx.focusedNodeId, ctx.attributes("cascade.todo"), ctx.op),
		},
		{
			id: "todo.convert",
			title: "Convert to todo",
			when: "hasFocusedNode && nodeKind != 'cascade.todo'",
			run: (ctx) => transaction(ctx.op, [
				{ kind: "node.setKind", nodeId: ctx.focusedNodeId, nodeKind: "cascade.todo" },
				{
					kind: "node.setAttribute", nodeId: ctx.focusedNodeId,
					namespace: "cascade.todo", value: todoKind.defaultAttributes,
				},
			]),
		},
	],

	keybindings: [{ key: "Mod+Enter", command: "todo.toggle", when: "nodeKind == 'cascade.todo'" }],

	slots: [
		{
			slot: "row.aside",
			id: "todo.due",
			when: ({ attributes }) => attributes["cascade.todo"]?.due != null,
			render: ({ attributes }) => <DueBadge date={attributes["cascade.todo"].due} />,
		},
	],

	// Subtree progress counts, derived — never stored on the node.
	projections: [
		{
			id: "todo.counts",
			initial: new Map<NodeId, { done: number; total: number }>(),
			rebuild: (doc) => countTodos(doc),
			reduce: (state, op, doc) =>
				op.kind === "node.setAttribute" && op.namespace === "cascade.todo"
					? recountAncestors(state, op.nodeId, doc)
					: op.kind === "node.move" || op.kind === "node.delete"
						? countTodos(doc)
						: state,
		},
	],

	migrations: [
		{
			namespace: "cascade.todo",
			from: 1,
			to: 2,
			// v1 stored `checked`; v2 renamed it and added completion time.
			migrate: (v) => ({ v: 2, done: (v as { checked: boolean }).checked, completedAt: null, due: null }),
		},
	],
});
```

Nothing in `@cascade/core`, `@cascade/db` or the operation vocabulary changed.
The same shape supports date pickers, kanban views, code blocks, embeds and
per-node permissions.

## 10. Third-party extensions

First-party extensions run in-process; that is fine, because they ship in the
same build and go through review. Third-party code does not, and the moment it
is allowed in, three things become mandatory:

1. **Isolation.** Extensions run in a Web Worker with no DOM access. Slot
   renders return a serializable UI description (a small declarative node tree),
   which the host renders. This is more work than `iframe`s and much less than
   auditing arbitrary DOM access, and it keeps the main thread's frame budget
   under the host's control.
2. **Capabilities, declared in a manifest and granted by the user.**
   `read:document`, `write:operations`, `network:https://api.example.com`,
   `storage:extension-local`. No implicit ambient authority; anything not
   declared is denied at the message boundary.
3. **A stable, versioned host API.** The registries above are that API. It is
   versioned separately from the app, with a compatibility range in the
   manifest, and it never exposes internal types (a `Node` passed to an
   extension is a projected DTO, not the store's object).

Do not build this until there is a reason to. Do design the registries as if it
already existed — which is what §2–§8 do — because retrofitting isolation onto
an API that assumed shared memory is a rewrite.

## 11. What is deliberately not extensible

Saying no here is what keeps the rest possible:

- **The operation vocabulary.** Extensions compose existing operations; they do
  not add new ones. A new operation kind is a core change with a migration story
  ([03 §6](./03-operations-and-sync.md#6-versioning-the-vocabulary)), because
  every replica must understand it to converge.
- **The tree invariants.** One parent per node, no cycles, ordered siblings. Not
  configurable, not overridable.
- **The store.** No extension gets a mutable reference. Reads go through
  projections and props; writes go through transactions.
- **The sync protocol.** An extension cannot open its own channel into the
  document. It can use its own network capability for its own data.
