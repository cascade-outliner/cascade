# Cascade architecture

This directory is the design record for Cascade: how data is stored, how the
outliner front-end is built, and how both stay extendable without being rewritten.

It describes a **target architecture**, not the code that exists today. The repo
currently contains a static, non-editable outliner (`packages/ui/src/outliner`)
and a marketing site. Everything here is written so it can be built incrementally
on top of that, in the order given in [07-roadmap.md](./07-roadmap.md).

## Reading order

| # | Document | What it answers |
|---|---|---|
| 01 | [Principles and layering](./01-principles.md) | The one rule the whole system hangs off, and which package may import which |
| 02 | [Data model](./02-data-model.md) | Postgres schema, tree storage, ordering, deletion, search, sharing |
| 03 | [Operations and sync](./03-operations-and-sync.md) | The operation vocabulary, the op log, offline, conflicts, undo |
| 04 | [Front-end architecture](./04-frontend-architecture.md) | Store, projections, editing surface, selection, virtualization, keyboard |
| 05 | [Type safety](./05-type-safety.md) | Branded ids, one schema many consumers, exhaustiveness, error handling |
| 06 | [Extensibility](./06-extensibility.md) | Registries, node kinds, commands, slots, projections, plugin sandboxing |
| 07 | [Roadmap](./07-roadmap.md) | Milestones, definition of done, what not to build yet |

## The short version

Nine decisions carry most of the weight. Each is argued in the linked document.

| Decision | Choice | Why not the alternative |
|---|---|---|
| Tree storage | Adjacency list (`parent_id`) as the single source of truth | Closure tables and materialized paths both cost `O(subtree)` writes per move; an outliner moves subtrees constantly (indent, outdent, drag) |
| Sibling order | Fractional index string with jitter, tie-broken by `id` | Integer positions require rewriting every following sibling on insert |
| Mutation surface | A closed, versioned union of ~12 operations | Ad-hoc endpoints make undo, offline, audit and extensions four separate problems instead of one |
| Deletion | Move into a per-workspace trash node | Makes delete, restore and undo the same code path as move |
| Sync | Server-authoritative op log, optimistic client apply, rebase on reject | A full tree CRDT is a large upfront cost; the op vocabulary keeps the door open (see [03](./03-operations-and-sync.md)) |
| Write serialization | One advisory lock per workspace around each mutation | Buys monotonic log sequencing *and* cycle safety in one line; workspace-scoped writes are small and rare enough |
| Editing surface | Static rows, with a live editor mounted only on the focused row | A single ProseMirror document over the whole tree defeats virtualization; a `contenteditable` per row costs 10k editor instances |
| Front-end state | Normalized external store + per-node subscriptions, projected into a flat visible-row list | Keeping the tree in React state re-renders subtrees on every keystroke |
| Extension model | Typed registries fed by declarative contributions; extensions emit operations, never mutate state | Lifecycle hooks with direct store access cannot be made deterministic, and determinism is what sync requires |

## Conventions used here

- **Must / should / may** are load-bearing. "Must" marks an invariant that other
  parts of the system assume; breaking it breaks something distant.
- Code samples are illustrative TypeScript and SQL, written to compile in spirit
  rather than copy-pasted from a build. They use tabs and double quotes to match
  the repo's Biome config.
- Where a design has a real cost, the cost is stated. A document that only lists
  advantages is marketing, not architecture.

## Sources consulted

Background reading behind the sync and ordering decisions:

- [A highly-available move operation for replicated trees](https://martin.kleppmann.com/papers/move-op.pdf) — Kleppmann et al., the move/cycle algorithm summarized in [03](./03-operations-and-sync.md)
- [Movable tree CRDTs and Loro's implementation](https://loro.dev/blog/movable-tree) — production tree CRDT with sortable children
- [Fractional indexing](https://vlcn.io/blog/fractional-indexing) and [fractional-indexing-jittered](https://github.com/TMeerhof/fractional-indexing-jittered) — key generation, interleaving, jitter, rebalancing
- [Hierarchical models in PostgreSQL](https://www.ackee.agency/blog/hierarchical-models-in-postgresql) and [Modeling hierarchical tree data in PostgreSQL](https://leonardqmarcq.com/posts/modeling-hierarchical-tree-data) — adjacency list vs closure table vs `ltree`
- [TanStack DB overview](https://tanstack.com/db/latest/docs/overview) and [Electric collections](https://tanstack.com/db/latest/docs/collections/electric-collection) — the optimistic-mutation-plus-sync pattern, if we later adopt it wholesale
- [oRPC v1](https://orpc.dev/blog/v1-announcement) — contract-first typed RPC, already the README's stated choice
