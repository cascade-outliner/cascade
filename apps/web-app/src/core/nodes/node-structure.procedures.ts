import { randomUUID } from "node:crypto";
import type { CalendarDateString } from "@cascade/outliner/calendar-date";
import type { NodeMetadata, NodeTypeName } from "@cascade/outliner/node-types";
import { and, asc, desc, eq, gt, inArray, isNull, lt, sql } from "drizzle-orm";
import { generateKeyBetween } from "fractional-indexing";
import { z } from "zod";
import { nodeColumns } from "@/core/nodes/node.queries";
import { nodes, nodeTags } from "@/core/nodes/node.schema";
import { chunk, DUPLICATE_BATCH_SIZE } from "@/core/nodes/node-batch";
import { ancestorsOf } from "@/core/nodes/node-tree-cte";
import { db } from "@/db";
import { authed } from "@/orpc/context";

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
			.where(and(eq(nodes.id, input.id), eq(nodes.userId, context.user.id)))
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
				.where(and(eq(nodes.id, input.id), eq(nodes.userId, userId)))
				.for("update");
			if (!moved) throw errors.NOT_FOUND();

			if (input.parentId) {
				// The anchor also verifies the target parent exists and belongs to
				// this user; an empty result means it doesn't.
				const ancestors = (await tx.execute(sql`
					WITH RECURSIVE ${ancestorsOf(input.parentId, userId)}
					SELECT id FROM chain
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
				.where(and(eq(nodes.id, input.id), eq(nodes.userId, userId)))
				.for("update");
			if (!original) throw errors.NOT_FOUND();

			const subtree = (await tx.execute(sql`
				WITH RECURSIVE subtree AS (
					SELECT id, parent_id, content, type, metadata, expanded, "order", due_date
					FROM nodes WHERE id = ${input.id} AND user_id = ${userId}
					UNION ALL
					SELECT c.id, c.parent_id, c.content, c.type, c.metadata, c.expanded, c."order", c.due_date
					FROM nodes c
					JOIN subtree s ON c.parent_id = s.id
					WHERE c.user_id = ${userId}
				)
				SELECT * FROM subtree
			`)) as unknown as SubtreeRow[];

			const idMap = new Map(subtree.map((row) => [row.id, randomUUID()]));
			const newRootId = idMap.get(input.id) as string;

			const parentFilter = and(
				eq(nodes.userId, userId),
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
			for (const batch of chunk(nodeValues, DUPLICATE_BATCH_SIZE)) {
				await tx.insert(nodes).values(batch);
			}

			const subtreeIds = subtree.map((row) => row.id);
			const tagRows: { nodeId: string; tagId: string }[] = [];
			for (const idBatch of chunk(subtreeIds, DUPLICATE_BATCH_SIZE)) {
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
			for (const batch of chunk(tagValues, DUPLICATE_BATCH_SIZE)) {
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
