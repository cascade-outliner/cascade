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
	isNull,
	like,
	lt,
	sql,
} from "drizzle-orm";
import { generateKeyBetween } from "fractional-indexing";
import { z } from "zod";
import { nodeColumns, nodeTagNames } from "@/core/nodes/node.queries";
import { nodes, nodeTags, tags as tagsTable } from "@/core/nodes/node.schema";
import { updateNodeContentInputSchema } from "@/core/nodes/node-content-schema";
import { setNodeTagsInputSchema } from "@/core/nodes/tag-name-schema";
import { db } from "@/db";
import { authed } from "@/orpc/context";
import {
	isUuid,
	isUuidFirstBlock,
	slugifyNodeContent,
} from "@/ui/nodes/node-slug";

export const listNodes = authed
	.input(z.object({ parentId: z.string().nullable() }))
	.handler(async ({ input, context }) => {
		return db
			.select(nodeColumns(context.user.id))
			.from(nodes)
			.where(
				and(
					eq(nodes.userId, context.user.id),
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
	due_date: Date | null;
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
		z.object({
			rootId: z.string().nullable(),
			cursor: z.array(z.string()).nullable().default(null),
			includeCollapsedDescendants: z.boolean().default(false),
			limit: z.number().int().min(1).max(2000).default(500),
		}),
	)
	.handler(async ({ input, context }) => {
		const { rootId, cursor, includeCollapsedDescendants, limit } = input;
		const userId = context.user.id;

		const result = (await db.execute(sql`
			WITH RECURSIVE visible AS (
				SELECT n.id, n.parent_id, n.content, n.type, n.metadata, n.expanded, n."order", n.due_date,
					0 AS depth,
					ARRAY[n."order"] AS path
				FROM nodes n
				WHERE n.user_id = ${userId}
					AND ${rootId === null ? sql`n.parent_id IS NULL` : sql`n.parent_id = ${rootId}`}
				UNION ALL
				SELECT c.id, c.parent_id, c.content, c.type, c.metadata, c.expanded, c."order", c.due_date,
					v.depth + 1,
					v.path || c."order"
				FROM nodes c
				JOIN visible v ON c.parent_id = v.id
				WHERE c.user_id = ${userId}
					AND (${includeCollapsedDescendants} = true OR v.expanded = true)
					AND v.depth < 64
			)
			SELECT v.id, v.parent_id, v.content, v.type, v.metadata, v.expanded, v."order", v.due_date, v.depth, v.path,
				EXISTS (SELECT 1 FROM nodes ch WHERE ch.parent_id = v.id AND ch.user_id = ${userId}) AS has_children,
				(lead(v.id) OVER (PARTITION BY v.parent_id ORDER BY v."order")) IS NULL AS is_last_child,
				${nodeTagNames(sql`v.id`)} AS tags
			FROM visible v
			${cursor ? sql`WHERE v.path > ${cursor}::text[]` : sql``}
			ORDER BY v.path
			LIMIT ${limit + 1}
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
		NOT_FOUND: { status: 404, message: "Node not found" },
	})
	.input(
		z.object({
			parentId: z.string().nullable(),
			afterId: z.string().nullable().optional(),
			dueDate: z.coerce.date().nullable().optional(),
		}),
	)
	.handler(async ({ input, context, errors }) => {
		const userId = context.user.id;
		const parentFilter = and(
			eq(nodes.userId, userId),
			input.parentId === null
				? isNull(nodes.parentId)
				: eq(nodes.parentId, input.parentId),
		);

		return await db.transaction(async (tx) => {
			await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${userId}))`);

			let order: string;
			if (input.afterId) {
				const [after] = await tx
					.select({ order: nodes.order })
					.from(nodes)
					.where(and(eq(nodes.id, input.afterId), eq(nodes.userId, userId)))
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
			.where(and(eq(nodes.id, input.id), eq(nodes.userId, context.user.id)))
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
					and(eq(nodes.id, input.slugId), eq(nodes.userId, context.user.id)),
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
			.where(and(eq(nodes.id, input.slugId), eq(nodes.userId, context.user.id)))
			.limit(1);
		if (!node) throw errors.NOT_FOUND();
		return node;
	});

export const getNodeAncestors = authed
	.input(z.object({ id: z.string() }))
	.handler(async ({ input, context }) => {
		const userId = context.user.id;
		const result = (await db.execute(sql`
			WITH RECURSIVE chain AS (
				SELECT id, parent_id, content, 0 AS depth FROM nodes
				WHERE id = ${input.id} AND user_id = ${userId}
				UNION ALL
				SELECT n.id, n.parent_id, n.content, c.depth + 1
				FROM nodes n JOIN chain c ON n.id = c.parent_id
				WHERE n.user_id = ${userId} AND c.depth < 64
			)
			SELECT id, content FROM chain ORDER BY depth DESC
		`)) as unknown as { id: string; content: unknown }[];
		return result;
	});

export const toggleNodeExpanded = authed
	.input(z.object({ id: z.string(), expanded: z.boolean() }))
	.handler(async ({ input, context }) => {
		await db
			.update(nodes)
			.set({ expanded: input.expanded })
			.where(and(eq(nodes.id, input.id), eq(nodes.userId, context.user.id)));
	});

export const setNodeDueDate = authed
	.input(z.object({ id: z.string(), dueDate: z.coerce.date().nullable() }))
	.handler(async ({ input, context }) => {
		await db
			.update(nodes)
			.set({ dueDate: input.dueDate })
			.where(and(eq(nodes.id, input.id), eq(nodes.userId, context.user.id)));
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
				.where(and(eq(nodes.id, input.id), eq(nodes.userId, userId)))
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
	.input(z.object({ id: z.string() }).and(typedMetadataSchema))
	.handler(async ({ input, context }) => {
		await db
			.update(nodes)
			.set({ type: input.type, metadata: input.metadata })
			.where(and(eq(nodes.id, input.id), eq(nodes.userId, context.user.id)));
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
			await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${userId}))`);

			const [moved] = await tx
				.select({ id: nodes.id })
				.from(nodes)
				.where(and(eq(nodes.id, input.id), eq(nodes.userId, userId)))
				.for("update");
			if (!moved) throw errors.NOT_FOUND();

			if (input.parentId) {
				// The anchor also verifies the target parent exists and belongs to
				// this user; an empty result means it doesn't.
				const ancestors = (await tx.execute(sql`
					WITH RECURSIVE ancestors AS (
						SELECT id, parent_id, 0 AS depth FROM nodes
						WHERE id = ${input.parentId} AND user_id = ${userId}
						UNION ALL
						SELECT n.id, n.parent_id, a.depth + 1 FROM nodes n
						JOIN ancestors a ON n.id = a.parent_id
						WHERE n.user_id = ${userId} AND a.depth < 64
					)
					SELECT id FROM ancestors
				`)) as unknown as { id: string }[];
				if (ancestors.length === 0) throw errors.NOT_FOUND();
				if (ancestors.some((a) => a.id === input.id)) {
					throw errors.INVALID_MOVE({
						message: "Cannot move a node into its own subtree",
					});
				}
			}

			const parentFilter = and(
				eq(nodes.userId, userId),
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
					.where(and(eq(nodes.id, input.targetId), eq(nodes.userId, userId)))
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

export const deleteNode = authed
	.input(z.object({ id: z.string() }))
	.handler(async ({ input, context }) => {
		const userId = context.user.id;
		const [result] = (await db.execute(sql`
			WITH RECURSIVE descendants AS (
				SELECT id, 0 AS depth FROM nodes WHERE parent_id = ${input.id} AND user_id = ${userId}
				UNION ALL
				SELECT c.id, d.depth + 1 FROM nodes c
				JOIN descendants d ON c.parent_id = d.id
				WHERE c.user_id = ${userId} AND d.depth < 64
			)
			DELETE FROM nodes WHERE id = ${input.id} AND user_id = ${userId}
			RETURNING (SELECT count(*) FROM descendants)::int AS count
		`)) as unknown as { count: number }[];

		return { childrenDeleted: result?.count ?? 0 };
	});

export const updateNodeContent = authed
	.input(updateNodeContentInputSchema)
	.handler(async ({ input, context }) => {
		await db
			.update(nodes)
			.set({ content: input.content })
			.where(and(eq(nodes.id, input.id), eq(nodes.userId, context.user.id)));
	});
