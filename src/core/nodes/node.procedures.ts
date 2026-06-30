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
				text: nodes.text,
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

export const toggleNodeExpanded = os
	.input(z.object({ id: z.string(), expanded: z.boolean() }))
	.handler(async ({ input }) => {
		await db
			.update(nodes)
			.set({ expanded: input.expanded })
			.where(eq(nodes.id, input.id));
	});
