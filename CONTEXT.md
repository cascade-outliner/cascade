# Cascade domain glossary

Terms used in code, docs and reviews. Use them exactly.

- **Outline**: the whole document, a tree of nodes. Held client-side by `OutlineStore` (`packages/data`), which is the source of truth.
- **Node**: one stored item of the outline (`Node` in `packages/data`). Has a parent, a fractional `order` key among its siblings, rich text `content` (a serialized Lexical state), a `collapsed` flag and an optional task state.
- **Row**: one visible line of the outline (`Row` in `packages/data`): a node, its depth below the current root, and its child count. `OutlineStore.rows(rootId)` derives rows from nodes; the UI only ever renders rows. Hiding a dragged row's descendants is the UI's concern (`packages/ui` dnd).
- **Zoom**: viewing one node as the root, so its children become the top-level rows and the node itself is shown in the zoom header. Zoom state lives in the URL (`/node/$id`), not in the store.
- **Task**: a node with `task: { done }`. Converting to and from text is `setTask`.
- **Capture bar**: the input at the bottom of the outline that creates a new node under the current root.
- **Persistence**: the seam behind the store (`OutlinePersistence`: `load` once, batched `write`). Adapters: `IdbPersistence` (IndexedDB, the app) and `MemoryPersistence` (tests, default).
