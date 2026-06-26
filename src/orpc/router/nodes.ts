import { os } from "@orpc/server";
import { eq } from "drizzle-orm";
import * as z from "zod";

import { db } from "#/db";
import { nodes } from "#/db/schema";

export const listNodes = os.handler(() => {
	return db.select().from(nodes).all();
});

export const addNode = os
	.input(
		z.object({
			parentId: z.string().nullable(),
			position: z.number(),
			text: z.string(),
		}),
	)
	.handler(({ input }) => {
		return db
			.insert(nodes)
			.values({ ...input, id: crypto.randomUUID() })
			.returning()
			.get();
	});

export const updateNode = os
	.input(
		z.object({
			id: z.string(),
			text: z.string().optional(),
			position: z.number().optional(),
		}),
	)
	.handler(({ input }) => {
		const { id, ...patch } = input;
		return db
			.update(nodes)
			.set(patch)
			.where(eq(nodes.id, id))
			.returning()
			.get();
	});

export const deleteNode = os
	.input(z.object({ id: z.string() }))
	.handler(({ input }) => {
		return db.delete(nodes).where(eq(nodes.id, input.id)).returning().get();
	});
