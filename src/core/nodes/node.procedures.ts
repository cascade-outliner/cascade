import { os } from "@orpc/server";
import { asc, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { nodes } from "#/core/nodes/node.schema";
import { db } from "#/db";

export const listNodes = os
	.input(z.object({ parentId: z.string().nullable() }))
	.handler(async ({ input }) => {
		return db
			.select({
				id: nodes.id,
				parentId: nodes.parentId,
				content: nodes.content,
				expanded: nodes.expanded,
				order: nodes.order,
				hasChildren: sql<boolean>`EXISTS (SELECT 1 FROM nodes c WHERE c.parent_id = nodes.id)`,
			})
			.from(nodes)
			.where(
				input.parentId === null
					? isNull(nodes.parentId)
					: eq(nodes.parentId, input.parentId),
			)
			.orderBy(asc(nodes.order));
	});

export const getNode = os
	.input(z.object({ id: z.string() }))
	.handler(async ({ input }) => {
		const [node] = await db
			.select({
				id: nodes.id,
				parentId: nodes.parentId,
				content: nodes.content,
				expanded: nodes.expanded,
				order: nodes.order,
				hasChildren: sql<boolean>`EXISTS (SELECT 1 FROM nodes c WHERE c.parent_id = nodes.id)`,
			})
			.from(nodes)
			.where(eq(nodes.id, input.id))
			.limit(1);
		return node ?? null;
	});

export const toggleNodeExpanded = os
	.input(z.object({ id: z.string(), expanded: z.boolean() }))
	.handler(async ({ input }) => {
		await db
			.update(nodes)
			.set({ expanded: input.expanded })
			.where(eq(nodes.id, input.id));
	});

export const deleteNode = os
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

export const updateNodeContent = os
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
