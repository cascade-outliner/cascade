# 07 — Roadmap

Ordered so that each milestone is shippable and the next one does not require
undoing the last. The rule throughout: **build the engine before the features**,
because the engine is what the features are cheap or expensive relative to.

Current state: `packages/ui/src/outliner` renders a static tree from a literal;
`apps/web-app` is a TanStack Start shell; `apps/website` is the Payload
marketing site; Postgres exists in `docker-compose.yml` but nothing talks to it.

## M0 — Foundations

Nothing user-visible. One or two days, and everything after is easier.

- Create `packages/schema` (branded ids, `Inline`, `Operation`, `Transaction`,
  zod schemas) and `packages/core` (`apply`, `invert`, `visibleRows`, `keyBetween`).
- Turn on the compiler settings and lint rules from
  [05](./05-type-safety.md#1-compiler-settings), including the import-cycle and
  restricted-import rules that enforce layering.
- `tsc --build` with project references, so CI checks package boundaries.
- Add Vitest. `@cascade/core` starts at high coverage and stays there.

**Done when:** operations can be applied and inverted in tests, with no browser
and no database.

## M1 — Local editing

The outliner becomes real, entirely in memory.

- `packages/outliner`: store, projections, command registry, keymap.
- Editing surface: static rows plus one live editor on the focused row
  ([04 §5](./04-frontend-architecture.md#5-the-editing-surface)).
- Commands: split, merge, indent, outdent, move up/down, collapse, zoom, undo/redo.
- Row selection, and the clipboard contract in all three MIME flavours.
- Convert `Outliner.Children` from recursive rendering to a flat row list, and
  make `Toggle`/`Bullet` real buttons with labels.

**Done when:** a person can write and restructure a document for an hour without
noticing a missing keystroke, refresh loses everything, and every tree operation
has a unit test.

## M2 — Persistence

- `packages/db`: Drizzle schema, hand-written migrations for triggers, generated
  columns and partial indexes.
- `packages/api`: the oRPC contract; `mutation.push`, `sync.snapshot`.
- Mutation pipeline: workspace advisory lock, validate, apply, write nodes,
  append to the log ([02 §8](./02-data-model.md#8-the-operation-log)).
- Auth and workspaces: sign-in, one workspace per user, root and trash nodes
  created with it.
- Client: snapshot loading, pending queue, IndexedDB persistence.

**Done when:** an edit survives a reload and a server restart; a killed network
mid-edit resumes cleanly; the log's `seq` is provably monotonic under a
concurrent write test.

## M3 — Multi-device

- `sync.pull` plus the SSE stream; rebase of pending transactions on confirmed
  advance.
- Reject handling with an explanation the user can act on.
- Trash view, restore, and the scheduled hard-delete job.
- Search over Postgres FTS, with expand-ancestors-of-match in the client.

**Done when:** two browsers on the same account converge within a second, an
offline tab reconnects without duplicating or losing anything, and every
conflict row in [03 §5](./03-operations-and-sync.md#5-conflicts-concretely) has
a passing test.

## M4 — Collaboration

- Workspace members, roles, permission checks in the mutation pipeline.
- Subtree sharing and public read-only pages (the one place SSR is used for the
  outline).
- Presence: who is here, whose caret is where. This is the point at which SSE
  may need to become a WebSocket
  ([03 §9](./03-operations-and-sync.md#9-transport)).
- Selective undo verified with two concurrent editors.

**Done when:** two people can edit the same outline for an hour without either
of them losing work or seeing the document jump.

## M5 — Extensions

- Extract the registries into `packages/extensions`; move todos, tags, mentions
  and backlinks onto them.
- Command palette reading the command registry.
- Projections API and the first server-hosted projection.
- Only then: evaluate third-party extensions and the worker sandbox
  ([06 §10](./06-extensibility.md#10-third-party-extensions)).

**Done when:** a new node kind with attributes, a renderer, commands, a slot and
a projection can be added in one file, with no change outside its own directory.

## Deliberately later

- **CRDT.** Revisit if long-offline editing or in-node co-editing becomes a real
  complaint. The vocabulary is already shaped for it
  ([03 §7](./03-operations-and-sync.md#7-if-and-when-we-need-a-crdt)).
- **Materialized path / `ltree`.** Only when a full-document query is measurably
  too slow.
- **A search cluster.** Postgres FTS plus a local index will carry a long way.
- **Mobile applications.** The store, core and sync packages are already
  platform-independent; the editing surface is not, and rewriting it for React
  Native is a project, not a port.
- **Real-time cursors, comments, AI features.** All of them sit on top of the op
  log; none of them should influence its design now.

## Risks worth tracking

| Risk | Signal to watch | Mitigation |
|---|---|---|
| Editing surface complexity | Focus, IME or clipboard bugs that keep reopening | Fall back to a ProseMirror doc over the rendered window ([04 §5](./04-frontend-architecture.md#5-the-editing-surface)) |
| Workspace lock contention | p99 mutation latency rising with team size | Narrow the lock to the affected subtree, or move to `SERIALIZABLE` with retry |
| Sort-key growth | Keys longer than ~40 chars appearing in production data | The rebalance operation already exists; automate it as a background job |
| Client/server validator drift | Rows visibly jumping after a save | Shared package plus a test that runs every validator through both entry points |
| Log growth | `mutation` table size outpacing `node` | Pruning below `min(acked_seq)` plus periodic snapshots |
