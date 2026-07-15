import {
	type NodeMetadata,
	type NodeTypeName,
	typedMetadataSchema,
	type VisibleNodeRow,
} from "@cascade/outliner/node-types";
import { and, asc, desc, eq, gt, isNull, like, lt, sql } from "drizzle-orm";
import { generateKeyBetween } from "fractional-indexing";
import { z } from "zod";
import { nodeColumns } from "@/core/nodes/node.queries";
import { nodes } from "@/core/nodes/node.schema";
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

function toVisibleNodeRows(rows: VisibleTreeSqlRow[]): VisibleNodeRow[] {
	return rows.map((r) => ({
		id: r.id,
		parentId: r.parent_id,
		content: r.content,
		type: r.type,
		metadata: r.metadata as NodeMetadata,
		expanded: r.expanded,
		order: r.order,
		dueDate: r.due_date,
		depth: Number(r.depth),
		path: r.path,
		hasChildren: r.has_children,
		isLastChild: r.is_last_child,
	}));
}

/**
 * Due-today match lookup, scoped to rootId's subtree, computed independently
 * of collapse state (nodes.expanded never gates this traversal).
 *
 * The recursive walk only carries the narrow columns needed to test a match
 * and to order/scope the result (skipping `content`, the largest column, and
 * `expanded`, which is irrelevant once a node is hidden); the due-date/
 * completed predicate runs in SQL via the indexed `due_date` column, and only
 * the resulting handful of matches gets joined back to `nodes` for their full
 * row. That keeps the traversal itself cheap even over a large tree, since
 * what dominates cost otherwise is shipping every node's full content across
 * the network only to discard almost all of it client-side.
 */
async function findDueTodayRows(
	userId: string,
	rootId: string | null,
	localDayStart: Date,
	limit: number,
): Promise<VisibleNodeRow[]> {
	const localDayEnd = new Date(localDayStart.getTime() + 86_400_000);

	const result = (await db.execute(sql`
		WITH RECURSIVE visible AS (
			SELECT n.id, n.parent_id, n."order", n.due_date, n.type, n.metadata,
				0 AS depth,
				ARRAY[n."order"] AS path
			FROM nodes n
			WHERE n.user_id = ${userId}
				AND ${rootId === null ? sql`n.parent_id IS NULL` : sql`n.parent_id = ${rootId}`}
			UNION ALL
			SELECT c.id, c.parent_id, c."order", c.due_date, c.type, c.metadata,
				v.depth + 1,
				v.path || c."order"
			FROM nodes c
			JOIN visible v ON c.parent_id = v.id
			WHERE c.user_id = ${userId} AND v.depth < 64
		),
		matched AS (
			SELECT v.id, v.parent_id, v.depth, v.path
			FROM visible v
			WHERE v.due_date >= ${localDayStart}
				AND v.due_date < ${localDayEnd}
				AND NOT (v.type = 'task' AND (v.metadata->>'completed')::boolean IS TRUE)
		)
		SELECT n.id, n.parent_id, n.content, n.type, n.metadata, n.expanded, n."order", n.due_date,
			m.depth, m.path,
			EXISTS (SELECT 1 FROM nodes ch WHERE ch.parent_id = m.id AND ch.user_id = ${userId}) AS has_children,
			(lead(m.id) OVER (PARTITION BY m.parent_id ORDER BY n."order")) IS NULL AS is_last_child
		FROM matched m
		JOIN nodes n ON n.id = m.id
		ORDER BY m.path
		LIMIT ${limit}
	`)) as unknown as VisibleTreeSqlRow[];

	return toVisibleNodeRows(result);
}

/**
 * Flat, depth-first list of every visible node (roots plus descendants of
 * expanded nodes), computed server-side in one recursive CTE. DFS order comes
 * from comparing fractional-index path arrays, which requires the `order`
 * column to use COLLATE "C" (byte-order comparison).
 *
 * With `filter: "today"` this delegates to findDueTodayRows instead, which
 * returns only due-today matches rather than the expanded-visible page.
 */
export const visibleTree = authed
	.input(
		z
			.object({
				rootId: z.string().nullable(),
				cursor: z.array(z.string()).nullable().default(null),
				limit: z.number().int().min(1).max(2000).default(500),
				filter: z.enum(["today"]).nullable().default(null),
				/** Start of "today" in the client's local timezone; required when filter is set. */
				localDayStart: z.coerce.date().nullable().default(null),
			})
			.refine((v) => v.filter !== "today" || v.localDayStart !== null, {
				message: 'localDayStart is required when filter is "today"',
				path: ["localDayStart"],
			}),
	)
	.handler(async ({ input, context }) => {
		const { rootId, cursor, limit, filter, localDayStart } = input;
		const userId = context.user.id;

		if (filter === "today") {
			if (!localDayStart) throw new Error("localDayStart is required");
			const rows = await findDueTodayRows(userId, rootId, localDayStart, limit);
			return { rows, nextCursor: null };
		}

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
		const rows = toVisibleNodeRows(page);

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
			.values({
				parentId: input.parentId,
				order,
				userId,
				dueDate: input.dueDate ?? null,
			})
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
