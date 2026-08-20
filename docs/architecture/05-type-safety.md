# 05 — Type safety

The goal is not "TypeScript compiles". It is that **wrong states are
unrepresentable and wrong calls do not typecheck**, so that reviews can focus on
semantics instead of on whether someone passed the wrong id.

## 1. Compiler settings

```jsonc
// tsconfig.base.json
{
	"compilerOptions": {
		"strict": true,
		"noUncheckedIndexedAccess": true,   // map.get(id) is T | undefined — it really is
		"exactOptionalPropertyTypes": true, // { a?: string } ≠ { a: string | undefined }
		"noImplicitOverride": true,
		"noFallthroughCasesInSwitch": true,
		"useUnknownInCatchVariables": true,
		"verbatimModuleSyntax": true,
		"isolatedModules": true,
		"moduleResolution": "bundler",
		"module": "esnext",
		"target": "es2023",
		"lib": ["es2023", "dom", "dom.iterable"],
		"skipLibCheck": true
	}
}
```

`noUncheckedIndexedAccess` is the one people disable when it gets noisy. Do not.
In a store built on `Map<NodeId, Node>`, it is precisely the setting that forces
every "the node might have been deleted by someone else" case to be handled —
which is the most common source of runtime errors in a collaborative outliner.

CI already runs `pnpm tsc`; keep it building **all** packages
(`tsc --build` with project references) so package boundaries are checked, not
just the app.

## 2. Branded ids

Every id in this system is a UUID string. Without branding, `moveNode(parentId,
nodeId)` and `moveNode(nodeId, parentId)` are the same type, and the bug ships.

```ts
// packages/schema/src/id.ts
declare const brand: unique symbol;
type Brand<T, B extends string> = T & { readonly [brand]: B };

export type NodeId = Brand<string, "NodeId">;
export type UserId = Brand<string, "UserId">;
export type WorkspaceId = Brand<string, "WorkspaceId">;
export type ClientId = Brand<string, "ClientId">;
export type SortKey = Brand<string, "SortKey">;
export type CommandId = Brand<string, "CommandId">;

export const nodeId = z.uuid().transform((v) => v as NodeId);
export const parseNodeId = (v: unknown): NodeId => nodeId.parse(v);

// The only sanctioned way to mint a fresh one, with the source of randomness
// injected so it can be made deterministic in tests and replay.
export const newNodeId = (ctx: OpContext): NodeId => ctx.uuid() as NodeId;
```

Rules:

- The `as NodeId` casts live in `packages/schema` and nowhere else. A cast
  anywhere else is a review blocker — it is the moment the guarantee stops being
  a guarantee.
- Branding `SortKey` is worth it too: it prevents "just pass the index" from
  compiling.
- Branded ids survive JSON serialization for free (they are strings at runtime),
  so nothing in the transport layer needs to know about them.

## 3. One schema, many consumers

```
                    packages/schema  (zod schemas + inferred types)
                             │
      ┌──────────┬───────────┼───────────┬──────────────┐
      ▼          ▼           ▼           ▼              ▼
  Drizzle    oRPC contract  client    op log         extension
  $type<>    input/output   parsing   payload        attribute
  columns    schemas        at edges  validation     validation
```

The zod schema is the source; TypeScript types are `z.infer` of it. Never write
the type by hand next to the schema — they drift, and the drift is invisible
until production.

```ts
export const inlineSchema: z.ZodType<Inline> = z.discriminatedUnion("type", [
	z.object({ type: z.literal("text"), text: z.string(), marks: z.array(markSchema).optional() }),
	z.object({ type: z.literal("tag"), name: z.string().min(1) }),
	z.object({ type: z.literal("mention"), userId: userId }),
	z.object({ type: z.literal("link"), nodeId: nodeId }),
	z.object({ type: z.literal("url"), href: z.url(), label: z.string().optional() }),
]);

export type Inline = z.infer<typeof inlineSchema>;
```

Where the type must be declared first (recursive structures), annotate the
schema with `z.ZodType<T>` so the compiler checks the schema against the type
rather than the other way round.

## 4. Make illegal states unrepresentable

Concrete places in this system where a union beats optional fields:

```ts
// A node is either the workspace root or has a parent. Not "parentId?: NodeId".
export type Node = Readonly<
	{ id: NodeId; kind: NodeKind; content: readonly Inline[]; attributes: NodeAttributes }
	& ({ role: "root" } | { role: "child"; parentId: NodeId; sortKey: SortKey })
>;

// A mirror has a source; a normal node cannot have one.
export type NodeBody =
	| { kind: "bullet" | "heading" | "todo"; content: readonly Inline[] }
	| { kind: "mirror"; sourceId: NodeId };

// Sync status is a state machine, not three booleans.
export type SyncStatus =
	| { state: "offline"; pending: number }
	| { state: "syncing"; pending: number }
	| { state: "synced"; seq: number }
	| { state: "error"; error: SyncError; pending: number };
```

`{ isLoading, isError, data }` permits eight states of which three are real. The
union permits exactly the real ones, and the compiler then forces the UI to
render all of them.

Exhaustiveness is enforced, not hoped for:

```ts
export function assertNever(value: never, message = "unreachable"): never {
	throw new Error(`${message}: ${JSON.stringify(value)}`);
}

switch (op.kind) {
	case "node.create": return applyCreate(state, op, ctx);
	// … every case …
	default: return assertNever(op);
}
```

Adding a thirteenth operation now produces a compile error in every place that
must learn about it — the apply function, the inverter, the server validator,
the history renderer. That is the mechanism that makes the vocabulary safe to
extend.

## 5. The API contract

oRPC is contract-first: the contract is a plain object, the server implements
it, the client infers from it. Two practical benefits over a procedure-first
router — the client's types do not depend on the server's implementation graph
(faster `tsc` on a large router), and the same contract emits an OpenAPI
document for anything non-TypeScript.

```ts
// packages/api/src/contract.ts
export const contract = oc.router({
	mutation: {
		push: oc
			.input(z.object({ workspaceId, transactions: z.array(transactionSchema).max(200) }))
			.output(z.object({ results: z.array(pushResultSchema) })),
	},
	sync: {
		snapshot: oc.input(z.object({ workspaceId, zoomRoot: nodeId.optional() }))
			.output(snapshotSchema),
		pull: oc.input(z.object({ workspaceId, cursor: z.number().int().nonnegative() }))
			.output(z.object({ transactions: z.array(logEntrySchema), seq: z.number() })),
	},
});
```

- **Errors are typed too.** Define a domain error union and map it to oRPC
  errors once, so the client can `switch` on `error.type` instead of parsing
  strings.
- **Inputs are bounded.** `max(200)` on a batch is a type-level and runtime
  guard against a client that has queued 50k pending transactions after a week
  offline; the queue drains in chunks instead of timing out forever.
- The contract package is imported by both sides and depends on neither.

## 6. Boundaries and parsing

Four boundaries, four parsers, no exceptions:

| Boundary | Parser | On failure |
|---|---|---|
| HTTP input | contract input schema | 400 with a typed error code |
| Database rows | `toDomainNode(row)` in the repository | log and quarantine the row; never crash the request |
| IndexedDB / localStorage | `parsePersistedState` | discard local state, re-sync from server |
| Clipboard | `parseClipboard` | fall back to plain text |

The database parser is the one that gets skipped, on the reasoning that "we
wrote those rows". Migrations, manual fixes, older application versions and
extension data all say otherwise, and an unparsed `attributes` blob reaching a
render function is a white screen.

```ts
export function toDomainNode(row: NodeRow, registry: Registry): Result<Node, RowError> {
	const attributes = registry.parseAttributes(row.attributes); // unknown namespaces preserved
	if (!attributes.ok) return attributes;
	return ok({
		id: row.id,
		...(row.parentId === null
			? { role: "root" as const }
			: { role: "child" as const, parentId: row.parentId, sortKey: row.sortKey as SortKey }),
		kind: row.kind,
		content: row.content,
		attributes: attributes.value,
	});
}
```

## 7. Errors as values

Domain failures are expected outcomes and get a type; bugs throw.

```ts
export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

export type ApplyError =
	| { type: "nodeNotFound"; nodeId: NodeId }
	| { type: "cycle"; nodeId: NodeId; parentId: NodeId }
	| { type: "depthExceeded"; nodeId: NodeId; limit: number }
	| { type: "notPermitted"; nodeId: NodeId; role: WorkspaceRole }
	| { type: "invalidAttribute"; namespace: string; issues: readonly string[] };
```

Every arm carries the data needed to render a message and to act on it — the
sync layer decides retry-vs-drop by `type`, and the UI writes "Alice deleted
this node" from `nodeNotFound`. A bare `Error("failed")` supports neither.

Do not build a generic `Result` framework with 30 combinators. Two helpers
(`ok`, `err`) and normal `if (!r.ok) return r` control flow read better than a
pipeline nobody on the team has memorized.

## 8. Determinism has a type

Everything that participates in sync must be reproducible, so the impure inputs
are a parameter:

```ts
export interface OpContext {
	readonly now: () => Timestamp;
	readonly uuid: () => string;
	readonly random: () => number;   // sort-key jitter
	readonly actorId: UserId;
	readonly clientId: ClientId;
}
```

Passing this everywhere is mildly annoying and entirely worth it: tests become
deterministic without mocking modules, replay produces byte-identical results,
and a lint rule can ban `Date.now`, `Math.random` and `crypto.randomUUID` inside
`@cascade/core` outright.

## 9. Registries that keep their keys

Extensibility usually destroys types: a `Map<string, unknown>` is where the
inference dies. It does not have to.

```ts
export interface NodeKindDefinition<K extends string, A> {
	readonly kind: K;
	readonly attributes: z.ZodType<A>;
	render(props: NodeRenderProps<A>): ReactNode;
	readonly commands?: readonly Command[];
}

export function defineNodeKind<const K extends string, A>(
	def: NodeKindDefinition<K, A>,
): NodeKindDefinition<K, A> {
	return def;
}

export function createRegistry<const D extends readonly NodeKindDefinition<string, unknown>[]>(
	definitions: D,
) {
	type Kinds = D[number]["kind"];
	type AttributesFor<K extends Kinds> = Extract<D[number], { kind: K }> extends
		NodeKindDefinition<K, infer A> ? A : never;

	return {
		kinds: definitions.map((d) => d.kind) as readonly Kinds[],
		get<K extends Kinds>(kind: K): Extract<D[number], { kind: K }> { /* … */ },
		parseAttributes<K extends Kinds>(kind: K, value: unknown): Result<AttributesFor<K>, ZodIssue[]> { /* … */ },
	};
}
```

`registry.get("todo")` returns the todo definition with its own attribute type —
not a union, not `unknown`. `const` type parameters (TS 5.0+) preserve the
literal kinds without `as const` at every call site.

## 10. Lint rules worth turning on

Biome is already configured with `recommended`. Add, at minimum:

- `noExplicitAny` (error, not warning)
- `noNonNullAssertion` — `!` is a cast in disguise, and in a store full of
  `Map.get` it is exactly the wrong instinct
- `useExhaustiveDependencies` for hooks
- `noImportCycles` — enforces the layering in
  [01 §8](./01-principles.md#8-package-layering)
- A restricted-import rule so `@cascade/core` cannot import React or DOM types,
  and `@cascade/ui` cannot import the store

Lint rules that encode architecture are worth more than lint rules that encode
style, because style is already automated and architecture is not.

## 11. Testing the types

Type-level regressions are silent. A handful of type tests pin the guarantees
that matter:

```ts
import { expectTypeOf } from "vitest";

expectTypeOf(registry.get("todo").attributes).toEqualTypeOf<z.ZodType<TodoAttributes>>();

// @ts-expect-error — a raw string must not be usable as a NodeId
moveNode("not-a-uuid", parentId);

// @ts-expect-error — the two id types must not be interchangeable
moveNode(workspaceId, parentId);
```

`@ts-expect-error` is the right tool here: if the constraint ever weakens, the
directive itself becomes an error and the build fails.
