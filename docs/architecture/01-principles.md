# 01 — Principles and layering

## 1. The spine: every change is an operation

There is exactly one way for the document to change:

```
user intent  →  command  →  operation(s)  →  store  →  projection  →  view
```

A **command** is a named, contextual action (`outline.indent`). An **operation**
is a small, serializable, invertible description of a change to the tree
(`{ kind: "move", nodeId, parentId, sortKey }`). Commands decide *what* should
happen; operations are *what happened*.

Nothing else writes. Not a component, not a mutation hook, not an extension.
When a keystroke, a drag, a paste, a sync message and a plugin all funnel into
the same vocabulary, five hard features collapse into one:

- **Undo/redo** is inverting operations.
- **Offline** is queuing operations.
- **Collaboration** is exchanging operations.
- **Audit and history** is keeping operations.
- **Extensibility** is letting third parties emit and observe operations.

If any of those feels hard later, the usual cause is a write path that skipped
the vocabulary. That is the invariant to defend in review.

The vocabulary is defined in [03-operations-and-sync.md](./03-operations-and-sync.md).

## 2. Pure core, impure edges

The tree logic — apply an operation, invert it, walk to the next visible row,
work out where the caret lands after an outdent — is pure, synchronous
TypeScript over plain data. No React, no DOM, no network, no clock, no `crypto`
calls that are not injected.

This is not purity for its own sake. It buys three specific things:

1. The same code runs on the client (optimistic apply), on the server
   (authoritative apply) and in tests. Divergence between client and server
   prediction is *the* recurring bug class in collaborative editors; sharing one
   implementation removes it by construction.
2. Tree semantics become testable without a browser. Indent-at-the-top-of-a-list
   is a two-line unit test rather than a Playwright run.
3. Replay works. Any bug reported as "my outline looks wrong" can be reproduced
   by replaying the operation log.

Concretely: `now()` and id generation are passed in as an `OpContext`, never
imported. See [05-type-safety.md](./05-type-safety.md#8-determinism-has-a-type).

## 3. Structure is derived, never stored twice

The tree shape lives in exactly one place: `parent_id` plus `sort_key` on each
node. Depth, ancestor paths, descendant counts, breadcrumb chains and the
flattened visible-row list are all **derived**.

Derived data may be *cached* (the front-end caches the flat row list; Postgres
may later cache a materialized path for search), but a cache is allowed to be
rebuilt from scratch at any time and must never be the thing a correctness
decision reads. Every denormalization you add is a second source of truth that
can drift during a concurrent move.

## 4. The document is a document, not a list of inputs

An outliner looks like a list of rows; it behaves like a text editor. Selection
crosses rows. Paste creates structure. Undo spans a keystroke and a re-parent.
Backspace at offset 0 merges two nodes.

Designing it as "a `<input>` per bullet" works for a week and then fights you
forever. Design decisions that follow from taking it seriously as a document —
a global selection model, a clipboard contract, caret effects returned from
operations — are in [04-frontend-architecture.md](./04-frontend-architecture.md).

## 5. Extension points are data, not callbacks

An extension contributes **declarative entries to typed registries**: a node
kind, a command, a keybinding, a row slot, a projection. It does not receive the
store and a free hand.

The reason is determinism (principle 2). Any code that participates in applying
operations must produce the same result on every replica; an escape hatch that
lets a plugin mutate state directly cannot be replayed, inverted or synced. The
registry shape is the enforcement mechanism, and it is also what makes the API
legible: you can list every extension point on one page
([06-extensibility.md](./06-extensibility.md)).

## 6. Parse at the boundary, trust inside

Untyped data enters at exactly four places: HTTP request bodies, database rows,
`localStorage`/IndexedDB, and the clipboard. Each has one parsing function that
turns unknown input into a domain type or a typed error. Past that line,
everything is already valid — no defensive checks, no `as`, no optional chaining
"just in case".

The corollary: domain types are never structurally identical to wire types or DB
rows. A `NodeRow` from Drizzle is mapped to a `Node`, once, at the repository
boundary. That mapping is where nullable columns become discriminated unions and
raw strings become branded ids.

## 7. Readability rules that are actually enforced

- **Name after the domain.** `indentNode`, `visibleRows`, `zoomRoot` — not
  `handleClick2`, `data`, `utils`.
- **One concept per module.** If a file needs "and" to describe it, split it.
- **No barrel file re-exporting a whole layer.** `packages/ui/src/outliner/index.ts`
  exporting the compound component is fine; a root `index.ts` that re-exports 40
  modules destroys tree-shaking and makes import graphs unreadable.
- **Comments explain why.** The `what` is the code. Places that deserve a
  comment: the advisory-lock rationale, the jitter in sort-key generation, the
  IME composition guard. Those are exactly the places a future reader will
  otherwise "simplify" into a bug.
- **Functions return values; effects are explicit.** An operation applier returns
  the new state and a selection effect. It does not move the caret itself.

## 8. Package layering

Dependencies point **downward only**. A cycle between these packages is a build
error, and should be enforced (Biome's `noImportCycles`, or a dependency-cruiser
check in CI).

```
                       apps/web-app            apps/website
                            │                  (independent, Payload)
                            ▼
                     @cascade/outliner   ← React binding: hooks, editing surface
                            │
              ┌─────────────┼─────────────┐
              ▼             ▼             ▼
       @cascade/ui   @cascade/sync   @cascade/extensions
      (headless      (transport,     (registries + first-party
       components)    op queue)       extensions)
              │             │             │
              └─────────────┼─────────────┘
                            ▼
                      @cascade/core        ← pure tree engine, op apply/invert
                            │
                            ▼
                     @cascade/schema       ← branded ids, zod schemas, op union
                                              (zero runtime deps beyond zod)

        server side:  apps/web-app/server → @cascade/db (Drizzle) → @cascade/core
```

Rules:

| Package | May import | Must not contain |
|---|---|---|
| `@cascade/schema` | nothing but `zod` | logic, IO |
| `@cascade/core` | `schema` | React, DOM, `fetch`, `Date.now`, `crypto.randomUUID` |
| `@cascade/ui` | `schema`, `theme` | data fetching, store access, business rules |
| `@cascade/sync` | `schema`, `core` | React |
| `@cascade/extensions` | `schema`, `core`, `ui` | direct store writes |
| `@cascade/outliner` | all of the above | SQL, HTTP route definitions |
| `@cascade/db` | `schema`, `core` | React, UI types |
| `apps/web-app` | everything | tree semantics |

`packages/ui` stays **headless and stateless**: it renders what it is given and
raises events. That is already the shape of the current compound components
(`Outliner.Root` / `Item` / `Bullet` / `Toggle` / `Content` / `Children`), and
it is worth preserving — it keeps visual work and semantic work separable, and
lets the same primitives render a read-only shared page, a search result list
and the editable outline.

The one change the current component set needs: `Outliner.Children` renders
`node.children` recursively, which makes virtualization impossible. The
recursive shape moves into a projection that emits a flat list of
`{ nodeId, depth }`, and `Children` becomes a layout primitive over that list.
See [04-frontend-architecture.md](./04-frontend-architecture.md#4-the-visible-row-projection).

## 9. Anti-goals

Written down so they can be pointed at in review:

- **No general graph.** Nodes have one parent. Mirrors (the same content shown
  in two places) are an explicit, constrained feature — not "nodes can have many
  parents". Multi-parent turns every traversal into cycle-detection and every
  permission check into a graph reachability query.
- **No plugin escape hatches before the plugin API is real.** A single
  `onBeforeApply(store)` hook will be used by first-party code, then depended on,
  then impossible to remove.
- **No premature CRDT.** The op log is designed so a CRDT can slot in
  ([03](./03-operations-and-sync.md#7-if-and-when-we-need-a-crdt)); adopting one
  on day one costs a large dependency, opaque debugging and a storage format
  that is hard to query from SQL.
- **No server-rendered outline editing.** The outline is a client-side
  application shell. SSR is for shared/public read-only views and the marketing
  site.
- **No feature flags in the tree engine.** Variation belongs in registries.
