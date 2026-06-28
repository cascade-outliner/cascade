import { ORPCError, os } from "@orpc/server";
import { eq, isNull, sql } from "drizzle-orm";
import * as z from "zod";

import { db } from "#/db";
import { nodes } from "./schema";

const hasChildrenExpr = sql<boolean>`EXISTS(SELECT 1 FROM nodes AS c WHERE c.parent_id = nodes.id)`;

export const listNodes = os.handler(async () => {
	return db
		.select({
			id: nodes.id,
			parentId: nodes.parentId,
			position: nodes.position,
			text: nodes.text,
			isOpen: nodes.isOpen,
			hasChildren: hasChildrenExpr,
		})
		.from(nodes)
		.where(isNull(nodes.parentId))
		.orderBy(nodes.position);
});

export const getChildren = os
	.input(z.object({ parentId: z.string() }))
	.handler(async ({ input }) => {
		return db
			.select({
				id: nodes.id,
				parentId: nodes.parentId,
				position: nodes.position,
				text: nodes.text,
				isOpen: nodes.isOpen,
				hasChildren: hasChildrenExpr,
			})
			.from(nodes)
			.where(eq(nodes.parentId, input.parentId))
			.orderBy(nodes.position);
	});

export const getNode = os
	.input(z.object({ id: z.string() }))
	.handler(async ({ input }) => {
		const [node] = await db
			.select()
			.from(nodes)
			.where(eq(nodes.id, input.id))
			.limit(1);
		if (!node) throw new ORPCError("NOT_FOUND");
		const children = await db
			.select({
				id: nodes.id,
				parentId: nodes.parentId,
				position: nodes.position,
				text: nodes.text,
				isOpen: nodes.isOpen,
				hasChildren: hasChildrenExpr,
			})
			.from(nodes)
			.where(eq(nodes.parentId, input.id))
			.orderBy(nodes.position);
		return { ...node, children };
	});

export const addNode = os
	.input(
		z.object({
			parentId: z.string().nullable(),
			position: z.number(),
			text: z.string(),
		}),
	)
	.handler(async ({ input }) => {
		const [row] = await db
			.insert(nodes)
			.values({ ...input, id: crypto.randomUUID() })
			.returning();
		return row;
	});

export const updateNode = os
	.input(
		z.object({
			id: z.string(),
			text: z.string().optional(),
			position: z.number().optional(),
			isOpen: z.boolean().optional(),
		}),
	)
	.handler(async ({ input }) => {
		const { id, ...patch } = input;
		const [row] = await db
			.update(nodes)
			.set(patch)
			.where(eq(nodes.id, id))
			.returning();
		return row;
	});

export const deleteNode = os
	.input(z.object({ id: z.string() }))
	.handler(async ({ input }) => {
		const [row] = await db
			.delete(nodes)
			.where(eq(nodes.id, input.id))
			.returning();
		return row;
	});
