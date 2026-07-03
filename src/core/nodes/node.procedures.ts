import { and, asc, desc, eq, gt, isNull, lt, sql } from "drizzle-orm";
import { generateKeyBetween } from "fractional-indexing";
import { z } from "zod";
import { nodeColumns } from "@/core/nodes/node.queries";
import { nodes } from "@/core/nodes/node.schema";
import type { VisibleNodeRow } from "@/core/nodes/node.types";
import {
	type NodeTypeName,
	typedMetadataSchema,
} from "@/core/nodes/node-types";
import { db } from "@/db";
import { base } from "@/orpc/context";

export const listNodes = base
	.input(z.object({ parentId: z.string().nullable() }))
	.handler(async ({ input }) => {
		return db
			.select(nodeColumns)
			.from(nodes)
			.where(
				input.parentId === null
					? isNull(nodes.parentId)
					: eq(nodes.parentId, input.parentId),
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
export const visibleTree = base
	.input(
		z.object({
			rootId: z.string().nullable(),
			cursor: z.array(z.string()).nullable().default(null),
			limit: z.number().int().min(1).max(2000).default(500),
		}),
	)
	.handler(async ({ input }) => {
		const { rootId, cursor, limit } = input;

		const result = (await db.execute(sql`
			WITH RECURSIVE visible AS (
				SELECT n.id, n.parent_id, n.content, n.type, n.metadata, n.expanded, n."order",
					0 AS depth,
					ARRAY[n."order"] AS path
				FROM nodes n
				WHERE ${rootId === null ? sql`n.parent_id IS NULL` : sql`n.parent_id = ${rootId}`}
				UNION ALL
				SELECT c.id, c.parent_id, c.content, c.type, c.metadata, c.expanded, c."order",
					v.depth + 1,
					v.path || c."order"
				FROM nodes c
				JOIN visible v ON c.parent_id = v.id
				WHERE v.expanded = true AND v.depth < 64
			)
			SELECT v.id, v.parent_id, v.content, v.type, v.metadata, v.expanded, v."order", v.depth, v.path,
				EXISTS (SELECT 1 FROM nodes ch WHERE ch.parent_id = v.id) AS has_children,
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

export const createNode = base
	.input(z.object({ parentId: z.string().nullable() }))
	.handler(async ({ input }) => {
		const parentFilter =
			input.parentId === null
				? isNull(nodes.parentId)
				: eq(nodes.parentId, input.parentId);
		const [last] = await db
			.select({ order: nodes.order })
			.from(nodes)
			.where(parentFilter)
			.orderBy(desc(nodes.order))
			.limit(1);
		const order = generateKeyBetween(last?.order ?? null, null);
		const [created] = await db
			.insert(nodes)
			.values({ parentId: input.parentId, order })
			.returning(nodeColumns);
		return created;
	});

export const getNode = base
	.errors({
		NOT_FOUND: { status: 404, message: "Node not found" },
	})
	.input(z.object({ id: z.string() }))
	.handler(async ({ input, errors }) => {
		const [node] = await db
			.select(nodeColumns)
			.from(nodes)
			.where(eq(nodes.id, input.id))
			.limit(1);
		if (!node) throw errors.NOT_FOUND();
		return node;
	});

export const getNodeAncestors = base
	.input(z.object({ id: z.string() }))
	.handler(async ({ input }) => {
		const result = (await db.execute(sql`
			WITH RECURSIVE chain AS (
				SELECT id, parent_id, content, 0 AS depth FROM nodes WHERE id = ${input.id}
				UNION ALL
				SELECT n.id, n.parent_id, n.content, c.depth + 1
				FROM nodes n JOIN chain c ON n.id = c.parent_id
				WHERE c.depth < 64
			)
			SELECT id, content FROM chain ORDER BY depth DESC
		`)) as unknown as { id: string; content: unknown }[];
		return result;
	});

export const toggleNodeExpanded = base
	.input(z.object({ id: z.string(), expanded: z.boolean() }))
	.handler(async ({ input }) => {
		await db
			.update(nodes)
			.set({ expanded: input.expanded })
			.where(eq(nodes.id, input.id));
	});

export const setNodeType = base
	.input(z.object({ id: z.string() }).and(typedMetadataSchema))
	.handler(async ({ input }) => {
		await db
			.update(nodes)
			.set({ type: input.type, metadata: input.metadata })
			.where(eq(nodes.id, input.id));
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

export const moveNode = base
	.errors({
		NOT_FOUND: { status: 404, message: "Node not found" },
		INVALID_MOVE: { status: 422, message: "Invalid move operation" },
	})
	.input(moveNodeInput)
	.handler(async ({ input, errors }) => {
		await db.transaction(async (tx) => {
			const [moved] = await tx
				.select({ id: nodes.id })
				.from(nodes)
				.where(eq(nodes.id, input.id))
				.for("update");
			if (!moved) throw errors.NOT_FOUND();

			if (input.parentId) {
				const cycle = await tx.execute(sql`
					WITH RECURSIVE ancestors AS (
						SELECT id, parent_id FROM nodes WHERE id = ${input.parentId}
						UNION ALL
						SELECT n.id, n.parent_id FROM nodes n JOIN ancestors a ON n.id = a.parent_id
					)
					SELECT 1 FROM ancestors WHERE id = ${input.id} LIMIT 1
				`);
				if (cycle.length > 0) {
					throw errors.INVALID_MOVE({
						message: "Cannot move a node into its own subtree",
					});
				}
			}

			const parentFilter =
				input.parentId === null
					? isNull(nodes.parentId)
					: eq(nodes.parentId, input.parentId);

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
					.where(eq(nodes.id, input.targetId))
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
				.where(eq(nodes.id, input.id));
		});
	});

export const deleteNode = base
	.input(z.object({ id: z.string() }))
	.handler(async ({ input }) => {
		await db.delete(nodes).where(eq(nodes.id, input.id));
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

export const updateNodeContent = base
	.input(
		z.object({
			id: z.string(),
			content: z.object({ root: lexicalElementNodeSchema }),
		}),
	)
	.handler(async ({ input }) => {
		await db
			.update(nodes)
			.set({ content: input.content })
			.where(eq(nodes.id, input.id));
	});
