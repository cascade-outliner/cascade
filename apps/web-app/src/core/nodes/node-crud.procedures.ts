import { typedMetadataSchema } from "@cascade/outliner/node-types";
import { and, asc, desc, eq, gt, isNull, lt, sql } from "drizzle-orm";
import { generateKeyBetween } from "fractional-indexing";
import { z } from "zod";
import { nodeColumns } from "@/core/nodes/node.queries";
import { nodes, nodeTags, tags as tagsTable } from "@/core/nodes/node.schema";
import { chunk, DUPLICATE_BATCH_SIZE } from "@/core/nodes/node-batch";
import {
	lexicalElementNodeSchema,
	updateNodeContentInputSchema,
} from "@/core/nodes/node-content-schema";
import { dueDateSchema } from "@/core/nodes/node-due-date-schema";
import { descendantsOf } from "@/core/nodes/node-tree-cte";
import { db } from "@/db";
import { authed } from "@/orpc/context";

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
			.where(and(eq(nodes.id, input.id), eq(nodes.userId, context.user.id)))
			.limit(1);
		if (!node) throw errors.NOT_FOUND();
		return node;
	});

export const updateNodeContent = authed
	.errors({
		NOT_FOUND: { status: 404, message: "Node not found" },
	})
	.input(updateNodeContentInputSchema)
	.handler(async ({ input, context, errors }) => {
		const [result] = await db
			.update(nodes)
			.set({ content: input.content })
			.where(and(eq(nodes.id, input.id), eq(nodes.userId, context.user.id)))
			.returning({ id: nodes.id });
		if (!result) throw errors.NOT_FOUND();
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
			.where(and(eq(nodes.id, input.id), eq(nodes.userId, context.user.id)))
			.returning({ id: nodes.id });
		if (updated.length === 0) throw errors.NOT_FOUND();
	});

export const deleteNode = authed
	.input(z.object({ id: z.string() }))
	.handler(async ({ input, context }) => {
		const userId = context.user.id;
		const [result] = (await db.execute(sql`
			WITH RECURSIVE ${descendantsOf(input.id, userId)}
			DELETE FROM nodes WHERE id = ${input.id} AND user_id = ${userId}
			RETURNING (SELECT count(*) FROM descendants)::int AS count
		`)) as unknown as { count: number }[];

		return { childrenDeleted: result?.count ?? 0 };
	});

const restoreTargetSchema = z.discriminatedUnion("position", [
	z.object({ position: z.literal("before"), targetId: z.string() }),
	z.object({ position: z.literal("after"), targetId: z.string() }),
	z.object({ position: z.literal("append") }),
]);

const nodeSnapshotSchema = z
	.object({
		id: z.string(),
		content: z.object({ root: lexicalElementNodeSchema }).nullable(),
		expanded: z.boolean(),
		dueDate: dueDateSchema.nullable(),
		tags: z.array(z.string()),
	})
	.and(typedMetadataSchema);

const descendantSnapshotSchema = nodeSnapshotSchema.and(
	z.object({ parentId: z.string(), order: z.string() }),
);

const restoreNodeInputSchema = z.object({
	parentId: z.string().nullable(),
	target: restoreTargetSchema,
	root: nodeSnapshotSchema,
	descendants: z.array(descendantSnapshotSchema),
});

/**
 * Reinserts a node and its full subtree with their original ids, content,
 * and tags — the undo of `deleteNode`, built from a snapshot the client held
 * onto from just before the delete ran. The root's order is recomputed
 * against `target`'s *current* siblings, since its old slot (or even its old
 * parent) may no longer exist; descendants keep their original `order`
 * values since their parent ids are exclusive to this subtree and can't
 * collide with anything created since the delete.
 */
export const restoreNode = authed
	.errors({
		NOT_FOUND: { status: 404, message: "Target parent not found" },
		INVALID_MOVE: { status: 422, message: "Restore target not found" },
	})
	.input(restoreNodeInputSchema)
	.handler(async ({ input, context, errors }) => {
		const userId = context.user.id;
		const { parentId, target, root, descendants } = input;

		return await db.transaction(async (tx) => {
			await tx.execute(
				sql`SELECT pg_advisory_xact_lock(hashtext('nodes'), hashtext(${userId}))`,
			);

			if (parentId !== null) {
				const [parent] = await tx
					.select({ id: nodes.id })
					.from(nodes)
					.where(and(eq(nodes.id, parentId), eq(nodes.userId, userId)))
					.limit(1);
				if (!parent) throw errors.NOT_FOUND();
			}

			const parentFilter = and(
				eq(nodes.userId, userId),
				parentId === null
					? isNull(nodes.parentId)
					: eq(nodes.parentId, parentId),
			);

			let order: string;
			if (target.position === "append") {
				const [last] = await tx
					.select({ order: nodes.order })
					.from(nodes)
					.where(parentFilter)
					.orderBy(desc(nodes.order))
					.limit(1);
				order = generateKeyBetween(last?.order ?? null, null);
			} else {
				const [anchor] = await tx
					.select({ order: nodes.order })
					.from(nodes)
					.where(and(parentFilter, eq(nodes.id, target.targetId)))
					.limit(1)
					.for("update");
				if (!anchor) throw errors.INVALID_MOVE();
				if (target.position === "before") {
					const [prev] = await tx
						.select({ order: nodes.order })
						.from(nodes)
						.where(and(parentFilter, lt(nodes.order, anchor.order)))
						.orderBy(desc(nodes.order))
						.limit(1);
					order = generateKeyBetween(prev?.order ?? null, anchor.order);
				} else {
					const [next] = await tx
						.select({ order: nodes.order })
						.from(nodes)
						.where(and(parentFilter, gt(nodes.order, anchor.order)))
						.orderBy(asc(nodes.order))
						.limit(1);
					order = generateKeyBetween(anchor.order, next?.order ?? null);
				}
			}

			await tx.insert(nodes).values({
				id: root.id,
				parentId,
				userId,
				content: root.content,
				type: root.type,
				metadata: root.metadata,
				expanded: root.expanded,
				order,
				dueDate: root.dueDate,
			});

			for (const batch of chunk(descendants, DUPLICATE_BATCH_SIZE)) {
				await tx.insert(nodes).values(
					batch.map((d) => ({
						id: d.id,
						parentId: d.parentId,
						userId,
						content: d.content,
						type: d.type,
						metadata: d.metadata,
						expanded: d.expanded,
						order: d.order,
						dueDate: d.dueDate,
					})),
				);
			}

			const allNodes = [root, ...descendants];
			const withTags = allNodes.filter((n) => n.tags.length > 0);
			if (withTags.length > 0) {
				const tagNames = [...new Set(withTags.flatMap((n) => n.tags))];
				const tagRows = await tx
					.insert(tagsTable)
					.values(tagNames.map((name) => ({ userId, name })))
					.onConflictDoUpdate({
						target: [tagsTable.userId, tagsTable.name],
						set: { name: sql`excluded.name` },
					})
					.returning({ id: tagsTable.id, name: tagsTable.name });
				const tagIdByName = new Map(tagRows.map((t) => [t.name, t.id]));
				const nodeTagValues = withTags.flatMap((n) =>
					n.tags.map((name) => ({
						nodeId: n.id,
						tagId: tagIdByName.get(name) as string,
					})),
				);
				for (const batch of chunk(nodeTagValues, DUPLICATE_BATCH_SIZE)) {
					await tx.insert(nodeTags).values(batch);
				}
			}

			const [created] = await tx
				.select(nodeColumns(userId))
				.from(nodes)
				.where(eq(nodes.id, root.id))
				.limit(1);
			return created;
		});
	});
