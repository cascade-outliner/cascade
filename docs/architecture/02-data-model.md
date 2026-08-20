# 02 — Data model

Target: PostgreSQL 17 (matching `docker-compose.yml`), accessed through Drizzle.
Everything below assumes the `pgcrypto` extension for `gen_random_uuid()`.

## 1. Choosing a tree representation

Four candidates, judged by the operations an outliner actually performs. The
dominant write is **moving a subtree** (indent, outdent, drag, delete-to-trash);
the dominant read is **loading the visible window**, which is bounded by what
the user has expanded, not by the size of the document.

| Representation | Move subtree | Descendants of X | Ancestors of X | Cost |
|---|---|---|---|---|
| Adjacency list (`parent_id`) | `O(1)` — one row | recursive CTE, `O(result)` | recursive CTE, `O(depth)` | reads need CTEs |
| Closure table | `O(descendants × depth)` row churn | index scan | index scan | move cost is brutal on deep subtrees |
| Materialized path / `ltree` | `O(descendants)` rewrites | prefix scan, very fast | free (parse the path) | move cost; `ltree` label/index limits |
| Nested sets | `O(n)` — renumbers the tree | range scan | range scan | disqualified |

**Decision: adjacency list is the source of truth.** A move is one row update;
`gen_random_uuid()` keys mean no renumbering; and because reads are bounded by
the expanded set rather than the document, the recursive CTE never walks more
than a few thousand rows in practice.

If full-document reads ever become the bottleneck (workspace-wide search
scoping, "show all descendants" reports), add an `ltree` path column maintained
by trigger as a **cache** — indexed with GiST, rebuildable, never consulted for
correctness. Do not add it up front: it turns every move into an `O(subtree)`
write and every concurrent move into a drift risk.

Rejected denormalization: a stored `depth` column. It has the same
`O(subtree)`-per-move cost, and both consumers are cheap without it — the client
already holds the tree and derives depth for free; the server only needs depth
for a max-depth guard, which is one `O(depth)` CTE at move time.

## 2. Core schema

```sql
create extension if not exists pgcrypto;

create table app_user (
	id            uuid primary key default gen_random_uuid(),
	email         citext not null unique,
	display_name  text not null,
	created_at    timestamptz not null default now()
);

create table workspace (
	id            uuid primary key default gen_random_uuid(),
	name          text not null,
	-- Set once, immediately after the root and trash nodes are inserted. The
	-- foreign keys are added after `node` exists and are deferrable, so the
	-- workspace and its two system nodes are created in one transaction.
	root_node_id  uuid not null,
	trash_node_id uuid not null,
	created_at    timestamptz not null default now()
);

-- …after the node table below is created:
-- alter table workspace
--   add constraint workspace_root_fk foreign key (root_node_id) references node(id)
--     deferrable initially deferred,
--   add constraint workspace_trash_fk foreign key (trash_node_id) references node(id)
--     deferrable initially deferred;

create type workspace_role as enum ('owner', 'admin', 'editor', 'commenter', 'viewer');

create table workspace_member (
	workspace_id  uuid not null references workspace(id) on delete cascade,
	user_id       uuid not null references app_user(id) on delete cascade,
	role          workspace_role not null,
	created_at    timestamptz not null default now(),
	primary key (workspace_id, user_id)
);
```

### The node table

```sql
create table node (
	id             uuid primary key default gen_random_uuid(),
	workspace_id   uuid not null references workspace(id) on delete cascade,
	parent_id      uuid references node(id) on delete restrict,

	-- Lexicographically sortable fractional index. See §3.
	-- COLLATE "C": fractional index keys must compare byte-wise (see §3).
	sort_key       text collate "C" not null,

	-- Extension point: which registered node kind renders and validates this row.
	kind           text not null default 'bullet',

	-- Rich text as an inline node array (see §5). Plain-text mirrors are
	-- maintained by the write path and exist only to feed full-text search.
	content        jsonb not null default '[]'::jsonb,
	content_text   text  not null default '',
	note           jsonb not null default '[]'::jsonb,
	note_text      text  not null default '',

	-- Namespaced, schema-validated extension data: {"todo": {"v":1, "done":true}}
	attributes     jsonb not null default '{}'::jsonb,

	-- Mirror support (§6). A mirror renders another node's content and children.
	mirror_of_id   uuid references node(id) on delete set null,

	deleted_at     timestamptz,
	-- Which delete moved this node to the trash, so restore is exact (§7).
	deleted_root_id uuid references node(id) on delete set null,

	created_at     timestamptz not null default now(),
	updated_at     timestamptz not null default now(),
	created_by     uuid not null references app_user(id),
	last_edited_by uuid not null references app_user(id),

	-- Bumped on every write; used for optimistic concurrency and field-level LWW.
	version        bigint not null default 1,

	search tsvector generated always as (
		to_tsvector('simple', content_text || ' ' || note_text)
	) stored,

	constraint node_not_own_parent check (parent_id is distinct from id),
	constraint node_mirror_not_self check (mirror_of_id is distinct from id),
	-- A mirror is a pointer, not a container.
	constraint node_mirror_is_leaf check (mirror_of_id is null or kind = 'mirror'),

	-- Enables the composite foreign key below.
	unique (id, workspace_id)
);

-- A child must live in the same workspace as its parent. Enforced by the
-- database rather than by application discipline: a cross-workspace parent is
-- a data leak, not just a bug.
alter table node
	add constraint node_parent_same_workspace
	foreign key (parent_id, workspace_id)
	references node (id, workspace_id);

-- Exactly one parentless node per workspace: its root. The trash is a normal
-- child of the root with kind 'system:trash'.
create unique index node_one_root_per_workspace
	on node (workspace_id) where parent_id is null;

-- The workhorse index: children of a parent, in order, live rows only.
create index node_children_idx
	on node (parent_id, sort_key, id) where deleted_at is null;

create index node_workspace_idx on node (workspace_id) where deleted_at is null;
create index node_search_idx    on node using gin (search);
create index node_attrs_idx     on node using gin (attributes jsonb_path_ops);
create index node_mirror_idx    on node (mirror_of_id) where mirror_of_id is not null;
create index node_trash_idx     on node (workspace_id, deleted_at) where deleted_at is not null;
```

Notes on choices that are easy to get wrong:

- **`on delete restrict` for `parent_id`, not `cascade`.** Rows are never hard
  deleted by the application (§7); a cascade would let a stray `DELETE` silently
  take a subtree with it, with no operation recorded and nothing to undo.
- **`to_tsvector('simple', …)` is immutable** in its two-argument form with a
  constant configuration, which is what makes the generated column legal. The
  one-argument form depends on `default_text_search_config` and will be
  rejected. `'simple'` avoids stemming surprises across languages; switch to a
  per-workspace configuration only if search quality demands it.
- **`content_text` is maintained by the write path**, not generated, because
  flattening the inline JSON to text needs a function that Postgres cannot prove
  immutable. Keep the flattening in `@cascade/core` so client and server produce
  identical text, and add a `BEFORE INSERT OR UPDATE` trigger only if you need
  to defend against writers outside the application.
- **`unique (id, workspace_id)` looks redundant** next to the primary key. It
  exists solely so the composite foreign key above can reference it. Keep the
  comment; someone will try to drop it.

### Per-user view state

Collapsed state is **per user**, not per node. A shared workspace where one
person's collapse folds the outline for everyone is a bug that is expensive to
retrofit, because it means moving a column out of `node` after clients depend
on it.

```sql
create table node_view_state (
	user_id    uuid not null references app_user(id) on delete cascade,
	node_id    uuid not null references node(id) on delete cascade,
	collapsed  boolean not null default false,
	primary key (user_id, node_id)
);
```

Only store rows that differ from the default. A user with 200 collapsed nodes in
a 100k-node workspace has 200 rows, and the loader treats "no row" as expanded.

## 3. Sibling ordering

`sort_key` is a **fractional index**: a string chosen so that
`key(a) < key(b)` lexicographically iff `a` sorts before `b`. Inserting between
two siblings generates a key strictly between their keys; no other row is
touched. This is what makes drag-and-drop and paste `O(1)` writes instead of
`O(siblings)`.

Rules:

0. **Declare the column as `text COLLATE "C"`.** Fractional index generators
   assume byte-wise lexicographic comparison. Under a locale collation — which
   is the default in most Postgres installations — punctuation and case are
   weighted differently, and the order the database returns is not the order the
   generator produced. v1 already does this
   ([08 §1](./08-what-v1-taught-us.md#1-keep-these--v1-got-them-right)); it is
   the single easiest thing on this page to get wrong and the hardest to
   diagnose afterwards.
1. **Order by `(sort_key, id)`, always.** Two clients that concurrently insert
   at the same position can generate the same key. Tie-breaking on `id` makes
   the resulting order arbitrary but *identical on every replica*, which is what
   actually matters.
2. **Do not put a unique constraint on `(parent_id, sort_key)`.** It converts a
   rare, harmless collision into a failed write for a user who did nothing
   wrong. Uniqueness is a nice-to-have; convergence is the requirement.
3. **Jitter every generated key.** Appending a few random characters makes
   collisions rare and, more importantly, reduces *interleaving*: without it,
   two clients each inserting three children under the same parent produce keys
   that alternate, shuffling both users' lists together. Jitter is not a
   guarantee — nothing at this layer is — but it moves interleaving from
   "routine" to "rare". (See
   [fractional-indexing-jittered](https://github.com/TMeerhof/fractional-indexing-jittered).)
4. **Rebalance when keys grow.** Repeatedly inserting in the same gap grows keys
   without bound. When any sibling's key exceeds ~40 characters, rewrite the
   whole sibling list with fresh evenly-spaced keys — as a normal `reorder`
   operation, so it syncs and can be undone like anything else.

```ts
// @cascade/core/src/order.ts
export function keyBetween(
	before: SortKey | null,
	after: SortKey | null,
	rng: () => number,
): SortKey;
```

`rng` is injected rather than imported, so ordering is reproducible in tests and
identical on client and server when replaying (see
[05](./05-type-safety.md#8-determinism-has-a-type)).

## 4. Cycles

Two moves that are individually valid can combine into a cycle: A moved under B
while, on another connection, B is moved under A. Both transactions read a tree
in which their own move is legal; both commit; the workspace now contains a
detached ring that no query can reach.

Defence in depth, in the order the checks run:

1. **Serialize writes per workspace.** Every mutation takes
   `pg_advisory_xact_lock` keyed on the workspace id before it reads. This is the
   primary fix — the second move now sees the first — and it is also what makes
   the op-log sequence monotonic (§8). A workspace is a single user's or a small
   team's document; serializing its writes costs nothing at this scale, and the
   lock is released automatically at transaction end.
2. **Check in the mutation, with a real error.** The move handler runs an
   ancestor query and returns a typed `MoveWouldCreateCycle` error, so the client
   can explain itself rather than showing a 500.
3. **Trigger as a backstop**, for migrations, admin scripts and anything that
   bypasses the application:

```sql
create or replace function node_assert_acyclic() returns trigger as $$
begin
	if new.parent_id is null then
		return new;
	end if;

	if exists (
		with recursive ancestors as (
			select n.id, n.parent_id from node n where n.id = new.parent_id
			union all
			select n.id, n.parent_id
			from node n join ancestors a on n.id = a.parent_id
		)
		select 1 from ancestors where id = new.id
	) then
		raise exception 'move would create a cycle: % under %', new.id, new.parent_id
			using errcode = 'check_violation';
	end if;

	return new;
end;
$$ language plpgsql;

create trigger node_assert_acyclic_trg
	before insert or update of parent_id on node
	for each row execute function node_assert_acyclic();
```

The trigger alone is **not** sufficient — under `READ COMMITTED` each of the two
concurrent moves passes its own check. Do not delete the advisory lock because
"the trigger handles it".

A depth cap (say 512) is worth enforcing in the same place: it bounds recursive
CTEs, protects the client's flattening pass, and catches runaway automation.

## 5. Node content

Content is an array of **inline nodes**, not an HTML string and not plain text:

```ts
type Inline =
	| { type: "text"; text: string; marks?: Mark[] }
	| { type: "tag"; name: string }          // #project
	| { type: "mention"; userId: UserId }    // @alice
	| { type: "link"; nodeId: NodeId }       // [[another node]]
	| { type: "url"; href: string; label?: string };

type Mark =
	| { type: "bold" }
	| { type: "italic" }
	| { type: "code" }
	| { type: "strike" }
	| { type: "highlight"; color: HighlightColor };
```

Why JSON and not HTML: HTML is unbounded (an attacker or a paste can put
anything in it), it forces sanitization on every render, and it cannot express
`mention` without inventing conventions. A closed union is validated once by
zod, is trivially diffable, and is the same structure the editor manipulates.

`inline.type` is an **extension point** — plugins register inline kinds
([06](./06-extensibility.md#4-inline-tokens)). The renderer must therefore treat
unknown inline types as opaque and preserve them verbatim rather than dropping
them, so that disabling a plugin does not destroy data.

## 6. Mirrors

A mirror shows another node's content and children in a second location. Model
it as a **pointer node**, never as a second parent:

- `kind = 'mirror'`, `mirror_of_id` set, no children of its own.
- Editing through a mirror emits operations against `mirror_of_id`. The
  operation vocabulary needs no mirror-specific cases — the UI resolves the
  target before emitting.
- Expansion is resolved lazily at read time with a **cycle guard**: while
  expanding, keep the set of source ids on the current path; when a mirror
  points at an ancestor of itself, render it collapsed with an "recursive
  mirror" affordance rather than recursing.
- Deleting the source leaves `mirror_of_id` null (`on delete set null`); the UI
  renders a tombstone. Do not cascade — a delete that silently removes rows
  elsewhere in the document is indistinguishable from data loss.

## 7. Deletion is a move

There is no `DELETE` in the application's vocabulary. Deleting a node moves it
under the workspace's trash node and stamps `deleted_at` plus `deleted_root_id`
on the whole subtree:

```sql
update node
set deleted_at = now(), deleted_root_id = $1
where id in (
	with recursive subtree as (
		select id from node where id = $1
		union all
		select n.id from node n join subtree s on n.parent_id = s.id
	)
	select id from subtree
);
update node set parent_id = $trash, sort_key = $key where id = $1;
```

Consequences, all of them good:

- Restore is exact: re-parent the root of the deleted set and clear `deleted_at`
  where `deleted_root_id = $1`. Nested deletes restore in the right layers,
  because an inner delete stamped its own `deleted_root_id`.
- Undo of a delete is the inverse `move` — no special case.
- Queries stay simple: every read filters `deleted_at is null`, and the partial
  indexes above make that free.
- Descendants carry `deleted_at` explicitly rather than inheriting it from an
  ancestor, so no read path has to walk upward to decide visibility. The cost is
  an `O(subtree)` update per delete, which is acceptable because deletes are rare
  compared to moves and the user is already waiting on a discrete action.

Hard deletion happens only in a scheduled job (trash older than N days) and in
GDPR-style erasure, both of which also purge the corresponding operation log
payloads.

## 8. The operation log

The log is a table, not a stream abstraction. It is the sync substrate
([03](./03-operations-and-sync.md)), the audit trail and the history feature.

```sql
create table mutation (
	workspace_id uuid   not null references workspace(id) on delete cascade,
	seq          bigint not null,
	id           uuid   not null,
	client_id    uuid   not null,
	client_seq   bigint not null,
	actor_id     uuid   not null references app_user(id),
	kind         text   not null,
	payload      jsonb  not null,
	created_at   timestamptz not null default now(),
	primary key (workspace_id, seq),
	-- Idempotency: a retried mutation is recognized, not re-applied.
	unique (client_id, client_seq)
);
```

**`seq` must not be a `bigserial`.** A sequence hands out numbers at statement
time, but transactions become visible at commit time, and those orders differ.
A client polling `where seq > $cursor` would then skip a mutation that got a low
number and committed late — silently, and only under load. Because every
mutation already holds the per-workspace advisory lock (§4), assigning
`seq = coalesce(max(seq), 0) + 1` inside the lock gives a sequence whose order
*is* commit order, with no gaps.

```sql
select pg_advisory_xact_lock(hashtextextended($workspace_id::text, 0));
-- read, validate, write node rows …
insert into mutation (workspace_id, seq, …)
values ($workspace_id, (select coalesce(max(seq), 0) + 1
                        from mutation where workspace_id = $workspace_id), …);
```

Clients record their high-water mark so the log can be compacted:

```sql
create table client_cursor (
	client_id    uuid primary key,
	user_id      uuid not null references app_user(id) on delete cascade,
	workspace_id uuid not null references workspace(id) on delete cascade,
	acked_seq    bigint not null default 0,
	last_seen_at timestamptz not null default now()
);
```

Retention: keep the full log for N days for history and debugging; beyond that,
prune entries below `min(acked_seq)` across clients seen recently, and rely on
periodic snapshots for clients that have been offline longer than the window
(they do a full re-sync, which is correct and rare).

## 9. Queries the application actually runs

**Load the visible window** — the subtree under a zoom root, descending only
into nodes the user has expanded:

```sql
with recursive visible as (
	select n.id, n.parent_id, n.kind, n.content, n.attributes, n.mirror_of_id,
	       0 as depth,
	       array[n.sort_key || ':' || n.id::text] as path
	from node n
	where n.id = $zoom_root and n.deleted_at is null

	union all

	select c.id, c.parent_id, c.kind, c.content, c.attributes, c.mirror_of_id,
	       v.depth + 1,
	       v.path || (c.sort_key || ':' || c.id::text)
	from node c
	join visible v on c.parent_id = v.id
	where c.deleted_at is null
	  and v.depth < $max_depth
	  and not exists (
		select 1 from node_view_state s
		where s.user_id = $user_id and s.node_id = v.id and s.collapsed
	  )
)
select * from visible order by path;
```

Ordering by the accumulated `path` array yields depth-first document order
directly from the database, and appending `id` to each element keeps the order
total when two siblings share a `sort_key`.

**Breadcrumbs** for a zoomed node — one `O(depth)` walk:

```sql
with recursive crumbs as (
	select id, parent_id, content_text, 0 as up from node where id = $1
	union all
	select n.id, n.parent_id, n.content_text, c.up + 1
	from node n join crumbs c on n.id = c.parent_id
)
select * from crumbs where up > 0 order by up desc;
```

**Search**, scoped to a workspace, ranked, with the matched node's ancestors
fetched separately for context:

```sql
select id, content_text, ts_rank(search, websearch_to_tsquery('simple', $2)) as rank
from node
where workspace_id = $1
  and deleted_at is null
  and search @@ websearch_to_tsquery('simple', $2)
order by rank desc, updated_at desc
limit 50;
```

Postgres FTS is the right starting point: no extra infrastructure, good enough
ranking, exact-phrase support via `websearch_to_tsquery`. Its limits are real —
no fuzzy matching, no per-user relevance, and search results have no cheap
"which part of the tree" filter until a path cache exists. Revisit only when a
user complains, and prefer a client-side index (the working set is already local)
over standing up a search cluster.

**Attribute queries** for extension-defined views (all todos due this week):

```sql
select id from node
where workspace_id = $1
  and deleted_at is null
  and attributes @> '{"todo": {"done": false}}'::jsonb
  and (attributes #>> '{todo,due}')::date between $2 and $3;
```

The `jsonb_path_ops` GIN index serves the containment predicate. If a particular
extension's queries become hot, promote its fields to a dedicated table with
real columns — the registry makes that a migration, not an API change.

## 10. Drizzle mapping

The schema file mirrors the SQL one-to-one, with branded ids applied at the
column level so a raw `string` can never be passed where a `NodeId` belongs:

```ts
// packages/db/src/schema/node.ts
import { sql } from "drizzle-orm";
import {
	index, jsonb, pgTable, text, timestamp, uniqueIndex, uuid, bigint,
} from "drizzle-orm/pg-core";
import type { Inline, NodeAttributes, NodeId, NodeKind, UserId, WorkspaceId } from "@cascade/schema";

export const node = pgTable(
	"node",
	{
		id: uuid("id").primaryKey().defaultRandom().$type<NodeId>(),
		workspaceId: uuid("workspace_id").notNull().$type<WorkspaceId>(),
		parentId: uuid("parent_id").$type<NodeId>(),
		sortKey: text("sort_key").notNull(),
		kind: text("kind").notNull().default("bullet").$type<NodeKind>(),
		content: jsonb("content").notNull().default(sql`'[]'::jsonb`).$type<Inline[]>(),
		contentText: text("content_text").notNull().default(""),
		attributes: jsonb("attributes").notNull().default(sql`'{}'::jsonb`).$type<NodeAttributes>(),
		mirrorOfId: uuid("mirror_of_id").$type<NodeId>(),
		deletedAt: timestamp("deleted_at", { withTimezone: true }),
		version: bigint("version", { mode: "bigint" }).notNull().default(1n),
		lastEditedBy: uuid("last_edited_by").notNull().$type<UserId>(),
	},
	(t) => [
		index("node_children_idx").on(t.parentId, t.sortKey, t.id).where(sql`deleted_at is null`),
		uniqueIndex("node_one_root_per_workspace").on(t.workspaceId).where(sql`parent_id is null`),
	],
);
```

Two rules keep this honest:

1. **`$type<…>()` is a claim, not a check.** It is sound only because every write
   path goes through a parser that produced the branded value in the first
   place. Never `as NodeId` at a call site to satisfy the compiler.
2. **`node.$inferSelect` does not leave the `db` package.** A repository function
   maps rows to domain `Node` values, converting `null` parents into the root
   discriminant and validating `attributes` against the registry. UI code that
   imports a Drizzle row type has coupled the render tree to the physical schema,
   and the next migration will be a refactor across the codebase instead of a
   file.

## 11. Migrations

- Drizzle Kit generates SQL; the generated file is committed and reviewed. Never
  run `push` against anything but a local database.
- **Expand, migrate, contract.** Add the new column nullable, backfill in
  batches, switch reads, then drop the old one in a later release. The client is
  a long-lived local-first application; an old tab will be talking to the new
  server for hours.
- Triggers, generated columns and partial indexes live in hand-written migration
  files next to the generated ones, because Drizzle does not model them. Keep
  them in `packages/db/migrations/manual/` with a numbered prefix so the order
  is unambiguous.
- Every migration that touches `node` must state, in a comment, what it does to
  in-flight operation log entries. A payload schema change is a data migration
  of the log, or a new operation `kind` — never a silent reinterpretation of an
  existing one ([03](./03-operations-and-sync.md#6-versioning-the-vocabulary)).
