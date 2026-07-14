import type { VisibleNodeRow } from "@cascade/outliner/node-types";
import {
	type NodeTypeName,
	typedMetadataSchema,
} from "@cascade/outliner/node-types";
import {
	and,
	asc,
	desc,
	eq,
	gt,
	gte,
	isNotNull,
	isNull,
	lt,
	lte,
	sql,
} from "drizzle-orm";
import { generateKeyBetween } from "fractional-indexing";
import { z } from "zod";
import { nodeColumns } from "@/core/nodes/node.queries";
import { nodes } from "@/core/nodes/node.schema";
import { db } from "@/db";
import { authed } from "@/orpc/context";

export const listNodes = authed
	.input(z.object({ parentId: z.string().nullable() }))
	.handler(async ({ input, context }) => {
		return db
			.select(nodeColumns)
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
			limit: z.number().int().min(1).max(2000).default(500),
		}),
	)
	.handler(async ({ input, context }) => {
		const { rootId, cursor, limit } = input;
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
				WHERE c.user_id = ${userId} AND v.expanded = true AND v.depth < 64
			)
			SELECT v.id, v.parent_id, v.content, v.type, v.metadata, v.expanded, v."order", v.due_date, v.depth, v.path,
				EXISTS (SELECT 1 FROM nodes ch WHERE ch.parent_id = v.id AND ch.user_id = ${userId}) AS has_children,
				(lead(v.id) OVER (PARTITION BY v.parent_id ORDER BY v."order")) IS NULL AS is_last_child
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
			metadata: r.metadata,
			expanded: r.expanded,
			order: r.order,
			dueDate: r.due_date,
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

		let order: string;
		if (input.afterId) {
			const [after] = await db
				.select({ order: nodes.order })
				.from(nodes)
				.where(and(eq(nodes.id, input.afterId), eq(nodes.userId, userId)))
				.limit(1);
			if (!after) throw errors.NOT_FOUND();
			const [next] = await db
				.select({ order: nodes.order })
				.from(nodes)
				.where(and(parentFilter, gt(nodes.order, after.order)))
				.orderBy(asc(nodes.order))
				.limit(1);
			order = generateKeyBetween(after.order, next?.order ?? null);
		} else {
			const [last] = await db
				.select({ order: nodes.order })
				.from(nodes)
				.where(parentFilter)
				.orderBy(desc(nodes.order))
				.limit(1);
			order = generateKeyBetween(last?.order ?? null, null);
		}

		const [created] = await db
			.insert(nodes)
			.values({ parentId: input.parentId, order, userId })
			.returning(nodeColumns);
		return created;
	});

export const getNode = authed
	.errors({
		NOT_FOUND: { status: 404, message: "Node not found" },
	})
	.input(z.object({ id: z.string() }))
	.handler(async ({ input, context, errors }) => {
		const [node] = await db
			.select(nodeColumns)
			.from(nodes)
			.where(and(eq(nodes.id, input.id), eq(nodes.userId, context.user.id)))
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
						SELECT id, parent_id FROM nodes
						WHERE id = ${input.parentId} AND user_id = ${userId}
						UNION ALL
						SELECT n.id, n.parent_id FROM nodes n
						JOIN ancestors a ON n.id = a.parent_id
						WHERE n.user_id = ${userId}
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
		const [{ count }] = (await db.execute(sql`
			WITH RECURSIVE descendants AS (
				SELECT id FROM nodes WHERE parent_id = ${input.id} AND user_id = ${userId}
				UNION ALL
				SELECT c.id FROM nodes c
				JOIN descendants d ON c.parent_id = d.id
				WHERE c.user_id = ${userId}
			)
			SELECT count(*)::int AS count FROM descendants
		`)) as unknown as [{ count: number }];

		await db
			.delete(nodes)
			.where(and(eq(nodes.id, input.id), eq(nodes.userId, userId)));

		return { childrenDeleted: count };
	});

const lexicalTextNodeSchema = z
	.object({
		type: z.literal("text"),
		text: z.string(),
		format: z.number().optional(),
	})
	.passthrough();

const lexicalElementNodeSchema: z.ZodType<unknown> = z.lazy(() =>
	z
		.object({
			type: z.string(),
			children: z
				.array(z.union([lexicalTextNodeSchema, lexicalElementNodeSchema]))
				.optional(),
		})
		.passthrough(),
);

export const updateNodeContent = authed
	.input(
		z.object({
			id: z.string(),
			content: z.object({ root: lexicalElementNodeSchema }),
		}),
	)
	.handler(async ({ input, context }) => {
		await db
			.update(nodes)
			.set({ content: input.content })
			.where(and(eq(nodes.id, input.id), eq(nodes.userId, context.user.id)));
	});
