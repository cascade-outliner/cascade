import { randomUUID } from "node:crypto";
import {
	type CalendarDateString,
	isValidCalendarDateString,
} from "@cascade/outliner/calendar-date";
import { normalizeTags } from "@cascade/outliner/node-tags";
import {
	type NodeMetadata,
	type NodeTypeName,
	typedMetadataSchema,
	type VisibleNodeRow,
} from "@cascade/outliner/node-types";
import {
	and,
	asc,
	count,
	desc,
	eq,
	gt,
	inArray,
	isNull,
	like,
	lt,
	sql,
} from "drizzle-orm";
import { generateKeyBetween } from "fractional-indexing";
import { z } from "zod";
import { nodeColumns } from "@/core/nodes/node.queries";
import {
	nodes,
	nodeTags,
	nodeVersions,
	tags as tagsTable,
} from "@/core/nodes/node.schema";
import { updateNodeContentInputSchema } from "@/core/nodes/node-content-schema";
import { ancestorsOf, descendantsOf } from "@/core/nodes/node-tree-cte";
import { setNodeTagsInputSchema } from "@/core/nodes/tag-name-schema";
import { isPremiumUser } from "@/core/premium/premium.access";
import { db } from "@/db";
import { authed } from "@/orpc/context";
import {
	isUuid,
	isUuidFirstBlock,
	slugifyNodeContent,
} from "@/ui/nodes/node-slug";

/** A `YYYY-MM-DD` calendar date, as sent by the client's due-date picker. */
const dueDateSchema = z
	.string()
	.refine(isValidCalendarDateString, { message: "Invalid calendar date" });

export const listNodes = authed
	.input(z.object({ parentId: z.string().nullable() }))
	.handler(async ({ input, context }) => {
		return db
			.select(nodeColumns(context.user.id))
			.from(nodes)
			.where(
				and(
					eq(nodes.userId, context.user.id),
					isNull(nodes.deletedAt),
					input.parentId === null
						? isNull(nodes.parentId)
						: eq(nodes.parentId, input.parentId),
				),
			)
			.orderBy(asc(nodes.order));
	});

interface VisibleTreeSqlRow {
	id: string;
	parent_id: string | null;
	content: unknown;
	type: NodeTypeName;
	metadata: unknown;
	expanded: boolean;
	order: string;
	due_date: CalendarDateString | null;
	depth: number;
	path: string[];
	has_children: boolean;
	is_last_child: boolean;
	tags: string[];
}

/**
 * Flat, depth-first list of every visible node (roots plus descendants of
 * expanded nodes), computed server-side in one recursive CTE. DFS order comes
 * from comparing fractional-index path arrays, which requires the `order`
 * column to use COLLATE "C" (byte-order comparison).
 */
export const visibleTree = authed
	.input(
		z
			.object({
				rootId: z.string().nullable(),
				cursor: z.array(z.string()).nullable().default(null),
				includeCollapsedDescendants: z.boolean().default(false),
				dueDateStart: dueDateSchema.optional(),
				dueDateEnd: dueDateSchema.optional(),
				limit: z.number().int().min(1).max(2000).default(500),
			})
			.refine(
				(input) =>
					(input.dueDateStart === undefined) ===
					(input.dueDateEnd === undefined),
				{ message: "Both due-date bounds are required" },
			),
	)
	.handler(async ({ input, context }) => {
		const {
			rootId,
			cursor,
			includeCollapsedDescendants,
			dueDateStart,
			dueDateEnd,
			limit,
		} = input;
		const userId = context.user.id;
		const cursorArray = cursor
			? sql`ARRAY[${sql.join(
					cursor.map((value) => sql`${value}`),
					sql`, `,
				)}]::text[]`
			: sql`NULL::text[]`;

		const result = (await db.execute(sql`
			WITH RECURSIVE params AS (
				SELECT ${cursorArray} AS cursor
				),
				visible AS (
				SELECT n.id, n.parent_id, n.content, n.type, n.metadata, n.expanded, n."order", n.due_date,
					0 AS depth,
					ARRAY[n."order"] AS path
				FROM nodes n, params
				WHERE n.user_id = ${userId}
					AND n.deleted_at IS NULL
					AND ${rootId === null ? sql`n.parent_id IS NULL` : sql`n.parent_id = ${rootId}`}
					AND (params.cursor IS NULL OR ARRAY[n."order"] >= params.cursor[1:1])
				UNION ALL
				SELECT c.id, c.parent_id, c.content, c.type, c.metadata, c.expanded, c."order", c.due_date,
					v.depth + 1,
					v.path || c."order"
				FROM nodes c
				JOIN visible v ON c.parent_id = v.id
				CROSS JOIN params
				WHERE c.user_id = ${userId}
					AND c.deleted_at IS NULL
					AND (${includeCollapsedDescendants} = true OR v.expanded = true)
					AND (
						params.cursor IS NULL
						OR (v.path || c."order") >= params.cursor[1:array_length(v.path, 1) + 1]
					)
				),
				matching_paths AS MATERIALIZED (
					SELECT v.path
					FROM visible v
					${dueDateStart && dueDateEnd ? sql`WHERE v.due_date BETWEEN ${dueDateStart}::date AND ${dueDateEnd}::date` : sql``}
				),
				filtered AS (
					SELECT v.*
					FROM visible v
					${
						dueDateStart && dueDateEnd
							? sql`WHERE EXISTS (
								SELECT 1
								FROM matching_paths m
								WHERE m.path[1:cardinality(v.path)] = v.path
							)`
							: sql``
					}
				),
				page AS MATERIALIZED (
					SELECT v.id, v.parent_id, v.content, v.type, v.metadata, v.expanded, v."order", v.due_date, v.depth, v.path,
						(lead(v.id) OVER (PARTITION BY v.parent_id ORDER BY v."order")) IS NULL AS is_last_child
					FROM filtered v
					${cursor ? sql`WHERE v.path > (SELECT cursor FROM params)` : sql``}
					ORDER BY v.path
					LIMIT ${limit + 1}
				)
			SELECT p.id, p.parent_id, p.content, p.type, p.metadata, p.expanded, p."order", p.due_date::text AS due_date, p.depth, p.path, p.is_last_child,
				COALESCE(hc.has_children, false) AS has_children,
				COALESCE(t.tags, '{}') AS tags
			FROM page p
			LEFT JOIN (
				SELECT n.parent_id, true AS has_children
				FROM nodes n
				WHERE n.user_id = ${userId} AND n.deleted_at IS NULL AND n.parent_id IN (SELECT id FROM page)
				GROUP BY n.parent_id
			) hc ON hc.parent_id = p.id
			LEFT JOIN (
				SELECT nt.node_id, array_agg(tg.name ORDER BY tg.name) AS tags
				FROM node_tags nt
				JOIN tags tg ON tg.id = nt.tag_id
				WHERE nt.node_id IN (SELECT id FROM page)
				GROUP BY nt.node_id
			) t ON t.node_id = p.id
			ORDER BY p.path
		`)) as unknown as VisibleTreeSqlRow[];

		const page = result.slice(0, limit);
		const rows: VisibleNodeRow[] = page.map((r) => ({
			id: r.id,
			parentId: r.parent_id,
			content: r.content,
			type: r.type,
			metadata: r.metadata as NodeMetadata,
			expanded: r.expanded,
			order: r.order,
			dueDate: r.due_date,
			tags: r.tags,
			depth: Number(r.depth),
			path: r.path,
			hasChildren: r.has_children,
			isLastChild: r.is_last_child,
		}));

		return {
			rows,
			nextCursor:
				result.length > limit ? (rows[rows.length - 1]?.path ?? null) : null,
		};
	});

export const createNode = authed
	.errors({
		NOT_FOUND: {
			status: 404,
			message: "Anchor node is not a child of the requested parent",
		},
	})
	.input(
		z.object({
			parentId: z.string().nullable(),
			afterId: z.string().nullable().optional(),
			dueDate: dueDateSchema.nullable().optional(),
		}),
	)
	.handler(async ({ input, context, errors }) => {
		const userId = context.user.id;
		const parentFilter = and(
			eq(nodes.userId, userId),
			isNull(nodes.deletedAt),
			input.parentId === null
				? isNull(nodes.parentId)
				: eq(nodes.parentId, input.parentId),
		);

		return await db.transaction(async (tx) => {
			await tx.execute(
				sql`SELECT pg_advisory_xact_lock(hashtext('nodes'), hashtext(${userId}))`,
			);

			let order: string;
			if (input.afterId) {
				const [after] = await tx
					.select({ order: nodes.order })
					.from(nodes)
					.where(and(parentFilter, eq(nodes.id, input.afterId)))
					.limit(1);
				if (!after) throw errors.NOT_FOUND();
				const [next] = await tx
					.select({ order: nodes.order })
					.from(nodes)
					.where(and(parentFilter, gt(nodes.order, after.order)))
					.orderBy(asc(nodes.order))
					.limit(1);
				order = generateKeyBetween(after.order, next?.order ?? null);
			} else {
				const [last] = await tx
					.select({ order: nodes.order })
					.from(nodes)
					.where(parentFilter)
					.orderBy(desc(nodes.order))
					.limit(1);
				order = generateKeyBetween(last?.order ?? null, null);
			}

			const [created] = await tx
				.insert(nodes)
				.values({
					parentId: input.parentId,
					order,
					userId,
					dueDate: input.dueDate ?? null,
				})
				.returning(nodeColumns(userId));
			return created;
		});
	});

export const getNode = authed
	.errors({
		NOT_FOUND: { status: 404, message: "Node not found" },
	})
	.input(z.object({ id: z.string() }))
	.handler(async ({ input, context, errors }) => {
		const [node] = await db
			.select(nodeColumns(context.user.id))
			.from(nodes)
			.where(
				and(
					eq(nodes.id, input.id),
					eq(nodes.userId, context.user.id),
					isNull(nodes.deletedAt),
				),
			)
			.limit(1);
		if (!node) throw errors.NOT_FOUND();
		return node;
	});

export const resolveNodeSlug = authed
	.errors({
		NOT_FOUND: { status: 404, message: "Node not found" },
		SLUG_AMBIGUOUS: { status: 409, message: "Ambiguous node slug" },
	})
	.input(z.object({ slugId: z.string(), slugText: z.string().nullable() }))
	.handler(async ({ input, context, errors }) => {
		if (isUuid(input.slugId)) {
			const [node] = await db
				.select({ id: nodes.id })
				.from(nodes)
				.where(
					and(
						eq(nodes.id, input.slugId),
						eq(nodes.userId, context.user.id),
						isNull(nodes.deletedAt),
					),
				)
				.limit(1);
			if (!node) throw errors.NOT_FOUND();
			return node;
		}

		if (isUuidFirstBlock(input.slugId)) {
			const candidates = await db
				.select({ id: nodes.id, content: nodes.content })
				.from(nodes)
				.where(
					and(
						eq(nodes.userId, context.user.id),
						isNull(nodes.deletedAt),
						like(nodes.id, `${input.slugId}-%`),
					),
				)
				.orderBy(asc(nodes.createdAt))
				.limit(20);

			if (candidates.length === 0) throw errors.NOT_FOUND();
			if (candidates.length === 1) return { id: candidates[0].id };

			const slugText = input.slugText?.trim();
			if (!slugText) throw errors.SLUG_AMBIGUOUS();

			const matches = candidates.filter(
				(candidate) => slugifyNodeContent(candidate.content) === slugText,
			);

			if (matches.length === 1) return { id: matches[0].id };
			if (matches.length === 0) throw errors.NOT_FOUND();
			throw errors.SLUG_AMBIGUOUS();
		}

		const [node] = await db
			.select({ id: nodes.id })
			.from(nodes)
			.where(
				and(
					eq(nodes.id, input.slugId),
					eq(nodes.userId, context.user.id),
					isNull(nodes.deletedAt),
				),
			)
			.limit(1);
		if (!node) throw errors.NOT_FOUND();
		return node;
	});

export const getNodeAncestors = authed
	.input(z.object({ id: z.string() }))
	.handler(async ({ input, context }) => {
		const userId = context.user.id;
		const result = (await db.execute(sql`
			WITH RECURSIVE ${ancestorsOf(input.id, userId)}
			SELECT id, content FROM chain ORDER BY depth DESC
		`)) as unknown as { id: string; content: unknown }[];
		return result;
	});

export const toggleNodeExpanded = authed
	.errors({
		NOT_FOUND: { status: 404, message: "Node not found" },
	})
	.input(z.object({ id: z.string(), expanded: z.boolean() }))
	.handler(async ({ input, context, errors }) => {
		const updated = await db
			.update(nodes)
			.set({ expanded: input.expanded })
			.where(
				and(
					eq(nodes.id, input.id),
					eq(nodes.userId, context.user.id),
					isNull(nodes.deletedAt),
				),
			)
			.returning({ id: nodes.id });
		if (updated.length === 0) throw errors.NOT_FOUND();
	});

export const setNodeDueDate = authed
	.errors({
		NOT_FOUND: { status: 404, message: "Node not found" },
	})
	.input(z.object({ id: z.string(), dueDate: dueDateSchema.nullable() }))
	.handler(async ({ input, context, errors }) => {
		const updated = await db
			.update(nodes)
			.set({ dueDate: input.dueDate })
			.where(
				and(
					eq(nodes.id, input.id),
					eq(nodes.userId, context.user.id),
					isNull(nodes.deletedAt),
				),
			)
			.returning({ id: nodes.id });
		if (updated.length === 0) throw errors.NOT_FOUND();
	});

/** This user's tags with how many nodes each is on, sorted by name. */
export const listTags = authed.handler(async ({ context }) => {
	return await db
		.select({ name: tagsTable.name, count: count(nodeTags.nodeId) })
		.from(tagsTable)
		.leftJoin(nodeTags, eq(nodeTags.tagId, tagsTable.id))
		.where(eq(tagsTable.userId, context.user.id))
		.groupBy(tagsTable.id)
		.orderBy(asc(tagsTable.name));
});

/** Deletes a tag outright (cascades to every node it's on), not just one node's use of it. */
export const deleteTag = authed
	.errors({
		NOT_FOUND: { status: 404, message: "Tag not found" },
	})
	.input(z.object({ name: z.string() }))
	.handler(async ({ input, context, errors }) => {
		const deleted = await db
			.delete(tagsTable)
			.where(
				and(
					eq(tagsTable.userId, context.user.id),
					eq(tagsTable.name, input.name),
				),
			)
			.returning({ id: tagsTable.id });
		if (deleted.length === 0) throw errors.NOT_FOUND();
	});

export const setNodeTags = authed
	.errors({
		NOT_FOUND: { status: 404, message: "Node not found" },
	})
	.input(setNodeTagsInputSchema)
	.handler(async ({ input, context, errors }) => {
		const userId = context.user.id;
		const names = normalizeTags(input.tags);

		await db.transaction(async (tx) => {
			const [node] = await tx
				.select({ id: nodes.id })
				.from(nodes)
				.where(
					and(
						eq(nodes.id, input.id),
						eq(nodes.userId, userId),
						isNull(nodes.deletedAt),
					),
				)
				.limit(1);
			if (!node) throw errors.NOT_FOUND();

			let tagIds: string[] = [];
			if (names.length > 0) {
				// onConflictDoUpdate (no-op set) so RETURNING also yields ids for
				// tags that already existed, not just newly-inserted ones.
				const rows = await tx
					.insert(tagsTable)
					.values(names.map((name) => ({ userId, name })))
					.onConflictDoUpdate({
						target: [tagsTable.userId, tagsTable.name],
						set: { name: sql`excluded.name` },
					})
					.returning({ id: tagsTable.id });
				tagIds = rows.map((r) => r.id);
			}

			await tx.delete(nodeTags).where(eq(nodeTags.nodeId, input.id));
			if (tagIds.length > 0) {
				await tx
					.insert(nodeTags)
					.values(tagIds.map((tagId) => ({ nodeId: input.id, tagId })));
			}
		});
	});

export const setNodeType = authed
	.errors({
		NOT_FOUND: { status: 404, message: "Node not found" },
	})
	.input(z.object({ id: z.string() }).and(typedMetadataSchema))
	.handler(async ({ input, context, errors }) => {
		const updated = await db
			.update(nodes)
			.set({ type: input.type, metadata: input.metadata })
			.where(
				and(
					eq(nodes.id, input.id),
					eq(nodes.userId, context.user.id),
					isNull(nodes.deletedAt),
				),
			)
			.returning({ id: nodes.id });
		if (updated.length === 0) throw errors.NOT_FOUND();
	});

const moveNodeBase = {
	id: z.string(),
	parentId: z.string().nullable(),
};

const moveNodeInput = z.discriminatedUnion("position", [
	z.object({
		...moveNodeBase,
		position: z.literal("before"),
		targetId: z.string(),
	}),
	z.object({
		...moveNodeBase,
		position: z.literal("after"),
		targetId: z.string(),
	}),
	z.object({ ...moveNodeBase, position: z.literal("append") }),
]);

export const moveNode = authed
	.errors({
		NOT_FOUND: { status: 404, message: "Node not found" },
		INVALID_MOVE: { status: 422, message: "Invalid move operation" },
	})
	.input(moveNodeInput)
	.handler(async ({ input, context, errors }) => {
		const userId = context.user.id;
		await db.transaction(async (tx) => {
			await tx.execute(
				sql`SELECT pg_advisory_xact_lock(hashtext('nodes'), hashtext(${userId}))`,
			);

			const [moved] = await tx
				.select({ id: nodes.id })
				.from(nodes)
				.where(
					and(
						eq(nodes.id, input.id),
						eq(nodes.userId, userId),
						isNull(nodes.deletedAt),
					),
				)
				.for("update");
			if (!moved) throw errors.NOT_FOUND();

			if (input.parentId) {
				// Confirms the target parent exists, belongs to this user, and
				// isn't itself (soft-)deleted — an invisible node isn't a valid
				// move target.
				const [parent] = await tx
					.select({ id: nodes.id })
					.from(nodes)
					.where(
						and(
							eq(nodes.id, input.parentId),
							eq(nodes.userId, userId),
							isNull(nodes.deletedAt),
						),
					)
					.limit(1);
				if (!parent) throw errors.NOT_FOUND();

				const ancestors = (await tx.execute(sql`
					WITH RECURSIVE ${ancestorsOf(input.parentId, userId)}
					SELECT id FROM chain
				`)) as unknown as { id: string }[];
				if (ancestors.some((a) => a.id === input.id)) {
					throw errors.INVALID_MOVE({
						message: "Cannot move a node into its own subtree",
					});
				}
			}

			const parentFilter = and(
				eq(nodes.userId, userId),
				isNull(nodes.deletedAt),
				input.parentId === null
					? isNull(nodes.parentId)
					: eq(nodes.parentId, input.parentId),
			);

			let before: string | null = null;
			let after: string | null = null;

			if (input.position === "append") {
				const [last] = await tx
					.select({ order: nodes.order })
					.from(nodes)
					.where(parentFilter)
					.orderBy(desc(nodes.order))
					.limit(1);
				before = last?.order ?? null;
			} else {
				const [target] = await tx
					.select({ order: nodes.order })
					.from(nodes)
					.where(and(parentFilter, eq(nodes.id, input.targetId)))
					.limit(1)
					.for("update");
				if (!target) {
					throw errors.INVALID_MOVE({ message: "Move target not found" });
				}
				if (input.position === "before") {
					const [prev] = await tx
						.select({ order: nodes.order })
						.from(nodes)
						.where(and(parentFilter, lt(nodes.order, target.order)))
						.orderBy(desc(nodes.order))
						.limit(1);
					before = prev?.order ?? null;
					after = target.order;
				} else {
					const [next] = await tx
						.select({ order: nodes.order })
						.from(nodes)
						.where(and(parentFilter, gt(nodes.order, target.order)))
						.orderBy(asc(nodes.order))
						.limit(1);
					before = target.order;
					after = next?.order ?? null;
				}
			}

			const order = generateKeyBetween(before, after);
			await tx
				.update(nodes)
				.set({ parentId: input.parentId, order })
				.where(and(eq(nodes.id, input.id), eq(nodes.userId, userId)));
		});
	});

interface SubtreeRow {
	id: string;
	parent_id: string | null;
	content: unknown;
	type: NodeTypeName;
	metadata: unknown;
	expanded: boolean;
	order: string;
	due_date: CalendarDateString | null;
}

// Postgres caps a single query at 65535 bind parameters. Chunk size is kept
// well under that for every batched query in this file: `duplicateNode`'s
// `nodes` insert (9 params/row) and `node_tags` inArray lookup/insert (1-2
// params/row), and `deleteNode`/`restoreDeletedSubtree`'s descendant-id
// inArray updates (1 param/row + a couple of fixed params), so a large
// subtree can't blow past the limit and fail the whole transaction (see
// apps/app/src/db/seed-tree.ts for the same constraint on the
// interactive/perf seed inserts).
const MAX_BATCH_SIZE = 5000;

function chunk<T>(items: T[], size: number): T[][] {
	const out: T[][] = [];
	for (let i = 0; i < items.length; i += size) {
		out.push(items.slice(i, i + size));
	}
	return out;
}

/**
 * Copies a node and its full subtree (content, tags, due date, type,
 * metadata, expanded state), inserting the copy as a sibling immediately
 * after the original. Descendants keep their original `order` values since
 * they move under freshly generated parent ids, so relative sibling order
 * within the copy is preserved for free; only the new root needs a
 * freshly computed order, between the original and its next sibling.
 */
export const duplicateNode = authed
	.errors({
		NOT_FOUND: { status: 404, message: "Node not found" },
	})
	.input(z.object({ id: z.string() }))
	.handler(async ({ input, context, errors }) => {
		const userId = context.user.id;

		return await db.transaction(async (tx) => {
			await tx.execute(
				sql`SELECT pg_advisory_xact_lock(hashtext('nodes'), hashtext(${userId}))`,
			);

			const [original] = await tx
				.select({ parentId: nodes.parentId, order: nodes.order })
				.from(nodes)
				.where(
					and(
						eq(nodes.id, input.id),
						eq(nodes.userId, userId),
						isNull(nodes.deletedAt),
					),
				)
				.for("update");
			if (!original) throw errors.NOT_FOUND();

			const subtree = (await tx.execute(sql`
				WITH RECURSIVE subtree AS (
					SELECT id, parent_id, content, type, metadata, expanded, "order", due_date
					FROM nodes WHERE id = ${input.id} AND user_id = ${userId} AND deleted_at IS NULL
					UNION ALL
					SELECT c.id, c.parent_id, c.content, c.type, c.metadata, c.expanded, c."order", c.due_date
					FROM nodes c
					JOIN subtree s ON c.parent_id = s.id
					WHERE c.user_id = ${userId} AND c.deleted_at IS NULL
				)
				SELECT * FROM subtree
			`)) as unknown as SubtreeRow[];

			const idMap = new Map(subtree.map((row) => [row.id, randomUUID()]));
			const newRootId = idMap.get(input.id) as string;

			const parentFilter = and(
				eq(nodes.userId, userId),
				isNull(nodes.deletedAt),
				original.parentId === null
					? isNull(nodes.parentId)
					: eq(nodes.parentId, original.parentId),
			);
			const [next] = await tx
				.select({ order: nodes.order })
				.from(nodes)
				.where(and(parentFilter, gt(nodes.order, original.order)))
				.orderBy(asc(nodes.order))
				.limit(1);
			const newOrder = generateKeyBetween(original.order, next?.order ?? null);

			const nodeValues = subtree.map((row) => ({
				id: idMap.get(row.id) as string,
				parentId:
					row.id === input.id
						? original.parentId
						: (idMap.get(row.parent_id as string) ?? null),
				userId,
				content: row.content,
				type: row.type,
				metadata: row.metadata as NodeMetadata,
				expanded: row.expanded,
				order: row.id === input.id ? newOrder : row.order,
				dueDate: row.due_date,
			}));
			for (const batch of chunk(nodeValues, MAX_BATCH_SIZE)) {
				await tx.insert(nodes).values(batch);
			}

			const subtreeIds = subtree.map((row) => row.id);
			const tagRows: { nodeId: string; tagId: string }[] = [];
			for (const idBatch of chunk(subtreeIds, MAX_BATCH_SIZE)) {
				tagRows.push(
					...(await tx
						.select({ nodeId: nodeTags.nodeId, tagId: nodeTags.tagId })
						.from(nodeTags)
						.where(inArray(nodeTags.nodeId, idBatch))),
				);
			}
			const tagValues = tagRows.map((row) => ({
				nodeId: idMap.get(row.nodeId) as string,
				tagId: row.tagId,
			}));
			for (const batch of chunk(tagValues, MAX_BATCH_SIZE)) {
				await tx.insert(nodeTags).values(batch);
			}

			const [created] = await tx
				.select(nodeColumns(userId))
				.from(nodes)
				.where(eq(nodes.id, newRootId))
				.limit(1);
			return created;
		});
	});

/**
 * Soft-deletes a node and its whole subtree: marks every row with
 * `deletedAt` (one instant shared across the whole batch) instead of
 * removing them, so their `node_versions` survive and the subtree can be
 * brought back later (see `restoreNodeVersion`). The deleted node itself
 * also gets its `order` rewritten to its own id — a value that can never
 * collide with a real fractional-index key — freeing its old
 * (userId, parentId, order) slot for a future sibling to reuse; descendants
 * keep their real `order` untouched, since nothing can be inserted under an
 * invisible (deleted) parent in the meantime, so there's no collision risk
 * for them to guard against.
 *
 * Takes the same per-user advisory lock `createNode`/`moveNode`/
 * `duplicateNode` do, serializing this against any of them concurrently
 * reparenting or inserting a node into the subtree being deleted — without
 * it, a node moved/created under `input.id` after the descendant snapshot
 * below but before this transaction commits would be silently orphaned
 * (parented under a deleted node, but never itself marked deleted, so it's
 * neither visible nor restorable, and would be permanently destroyed by
 * `parentId`'s cascade delete once the ancestor is eventually purged).
 *
 * A no-op (`childrenDeleted: 0`) if the node doesn't exist, isn't owned by
 * this user, or is already deleted — checked up front, before touching any
 * descendants, so a repeated delete call can never re-stamp already-deleted
 * descendants with a fresh `deletedAt`. Re-stamping them would desync their
 * `deletedAt` from the top node's original instant and break
 * `restoreDeletedSubtree`'s "restore the whole batch together" matching.
 */
export const deleteNode = authed
	.input(z.object({ id: z.string() }))
	.handler(async ({ input, context }) => {
		const userId = context.user.id;
		return await db.transaction(async (tx) => {
			await tx.execute(
				sql`SELECT pg_advisory_xact_lock(hashtext('nodes'), hashtext(${userId}))`,
			);

			const [target] = await tx
				.select({ id: nodes.id })
				.from(nodes)
				.where(
					and(
						eq(nodes.id, input.id),
						eq(nodes.userId, userId),
						isNull(nodes.deletedAt),
					),
				)
				.for("update");
			if (!target) return { childrenDeleted: 0 };

			const descendantRows = (await tx.execute(sql`
				WITH RECURSIVE ${descendantsOf(input.id, userId)}
				SELECT id FROM descendants
			`)) as unknown as { id: string }[];

			const deletedAt = new Date();

			for (const idBatch of chunk(
				descendantRows.map((row) => row.id),
				MAX_BATCH_SIZE,
			)) {
				await tx
					.update(nodes)
					.set({ deletedAt })
					.where(and(inArray(nodes.id, idBatch), eq(nodes.userId, userId)));
			}

			await tx
				.update(nodes)
				.set({ deletedAt, order: input.id })
				.where(and(eq(nodes.id, input.id), eq(nodes.userId, userId)));

			return { childrenDeleted: descendantRows.length };
		});
	});

/**
 * Un-deletes a soft-deleted subtree (see `deleteNode`) and reattaches its
 * top node — the rest of a version-history restore (see `restoreNodeVersion`
 * in `node-version.procedures.ts`) for a node that's currently deleted.
 *
 * Every row that was deleted together with `nodeId` (matched by the exact
 * `deletedAt` instant `deleteNode` gave the whole batch) has its `deletedAt`
 * cleared. Only the top node gets a freshly computed `order`, appended
 * under its original parent — or promoted to a root node if that parent is
 * itself currently deleted, since sibling positions there no longer make
 * sense — because it's the only one whose old slot was freed for reuse by a
 * new sibling (see `deleteNode`); descendants keep their exact original
 * `order`/`parentId` relationships to each other, which were never up for
 * grabs while the whole subtree was invisible.
 *
 * A no-op if the node isn't currently deleted (e.g. the version being
 * restored belongs to a node that's still around).
 */
export async function restoreDeletedSubtree(
	userId: string,
	nodeId: string,
): Promise<void> {
	await db.transaction(async (tx) => {
		await tx.execute(
			sql`SELECT pg_advisory_xact_lock(hashtext('nodes'), hashtext(${userId}))`,
		);

		const [target] = await tx
			.select({ deletedAt: nodes.deletedAt, parentId: nodes.parentId })
			.from(nodes)
			.where(and(eq(nodes.id, nodeId), eq(nodes.userId, userId)))
			.for("update");
		if (!target || target.deletedAt === null) return;

		// Resolved and computed before anything is un-deleted: `nodeId` itself
		// is still deleted (and still holds the sentinel `order` `deleteNode`
		// gave it, not a real fractional-index key) at this point, so it can't
		// accidentally be picked up as its own "last sibling" once it's active
		// again.
		let parentId = target.parentId;
		if (parentId !== null) {
			const [parent] = await tx
				.select({ id: nodes.id })
				.from(nodes)
				.where(
					and(
						eq(nodes.id, parentId),
						eq(nodes.userId, userId),
						isNull(nodes.deletedAt),
					),
				)
				.limit(1);
			if (!parent) parentId = null;
		}

		const parentFilter = and(
			eq(nodes.userId, userId),
			isNull(nodes.deletedAt),
			parentId === null ? isNull(nodes.parentId) : eq(nodes.parentId, parentId),
		);
		const [last] = await tx
			.select({ order: nodes.order })
			.from(nodes)
			.where(parentFilter)
			.orderBy(desc(nodes.order))
			.limit(1);
		const order = generateKeyBetween(last?.order ?? null, null);

		const descendantRows = (await tx.execute(sql`
			WITH RECURSIVE ${descendantsOf(nodeId, userId)}
			SELECT id FROM descendants
		`)) as unknown as { id: string }[];

		for (const idBatch of chunk(
			[nodeId, ...descendantRows.map((row) => row.id)],
			MAX_BATCH_SIZE,
		)) {
			await tx
				.update(nodes)
				.set({ deletedAt: null })
				.where(
					and(
						inArray(nodes.id, idBatch),
						eq(nodes.userId, userId),
						eq(nodes.deletedAt, target.deletedAt),
					),
				);
		}

		await tx
			.update(nodes)
			.set({ parentId, order })
			.where(and(eq(nodes.id, nodeId), eq(nodes.userId, userId)));
	});
}

/**
 * Overwrites a node's content, first snapshotting the current value into
 * `node_versions` when `snapshotFirst` is true — including when that value
 * is `null` (a node's state before it was ever given content), so a node's
 * very first edit shows up in its history as a "created" entry (an empty
 * "before" diffed against its first typed content) rather than being
 * invisible. Shared by `updateNodeContent` and `restoreNodeVersion`
 * (`node-version.procedures.ts`), which both need the same "preserve then
 * overwrite" behavior. Returns `false` if the node doesn't exist or isn't
 * owned by `userId`.
 *
 * `snapshotFirst` is the caller's job to decide: version history is a
 * premium feature (see `isPremiumUser`), so non-premium edits should pass
 * `false` and skip writing history nobody can see or restore, rather than
 * quietly accumulating it in case they upgrade later.
 */
export async function snapshotAndSetContent(
	userId: string,
	nodeId: string,
	content: unknown,
	snapshotFirst: boolean,
): Promise<boolean> {
	return await db.transaction(async (tx) => {
		const [current] = await tx
			.select({ content: nodes.content })
			.from(nodes)
			.where(and(eq(nodes.id, nodeId), eq(nodes.userId, userId)))
			.for("update");
		if (!current) return false;

		if (snapshotFirst) {
			await tx.insert(nodeVersions).values({
				nodeId,
				userId,
				content: current.content,
			});
		}

		await tx
			.update(nodes)
			.set({ content })
			.where(and(eq(nodes.id, nodeId), eq(nodes.userId, userId)));
		return true;
	});
}

export const updateNodeContent = authed
	.errors({
		NOT_FOUND: { status: 404, message: "Node not found" },
	})
	.input(updateNodeContentInputSchema)
	.handler(async ({ input, context, errors }) => {
		const isPremium = await isPremiumUser(context.user.id);
		const ok = await snapshotAndSetContent(
			context.user.id,
			input.id,
			input.content,
			isPremium,
		);
		if (!ok) throw errors.NOT_FOUND();
	});
