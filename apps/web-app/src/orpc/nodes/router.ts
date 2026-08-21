import { db, nodes } from "@cascade/db";
import { os } from "@orpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

const nodeSchema = z.object({
	id: z.uuid(),
	parentId: z.uuid().nullable(),
	userId: z.string(),
	content: z.unknown().nullable(),
	expanded: z.boolean(),
	createdAt: z.date(),
	updatedAt: z.date(),
});

const nodeInput = z.object({
	parentId: z.uuid().nullish(),
	userId: z.string(),
	content: z.unknown().nullish(),
	expanded: z.boolean().optional(),
});

export const nodesRouter = {
	list: os
		.route({ method: "GET", path: "/nodes" })
		.input(z.object({ userId: z.string() }))
		.output(z.object({ nodes: z.array(nodeSchema) }))
		.handler(async ({ input }) => {
			return {
				nodes: await db
					.select()
					.from(nodes)
					.where(eq(nodes.userId, input.userId)),
			};
		}),

	get: os
		.route({ method: "GET", path: "/nodes/{id}" })
		.errors({ NOT_FOUND: {} })
		.input(z.object({ id: z.uuid() }))
		.output(nodeSchema)
		.handler(async ({ input, errors }) => {
			const [node] = await db.select().from(nodes).where(eq(nodes.id, input.id));

			if (!node) {
				throw errors.NOT_FOUND();
			}

			return node;
		}),

	create: os
		.route({ method: "POST", path: "/nodes" })
		.input(nodeInput)
		.output(nodeSchema)
		.handler(async ({ input }) => {
			const [node] = await db.insert(nodes).values(input).returning();
			return node;
		}),

	update: os
		.route({ method: "PATCH", path: "/nodes/{id}" })
		.errors({ NOT_FOUND: {} })
		.input(nodeInput.partial().extend({ id: z.uuid() }))
		.output(nodeSchema)
		.handler(async ({ input, errors }) => {
			const { id, ...values } = input;
			const [node] = await db
				.update(nodes)
				.set(values)
				.where(eq(nodes.id, id))
				.returning();

			if (!node) {
				throw errors.NOT_FOUND();
			}

			return node;
		}),

	delete: os
		.route({ method: "DELETE", path: "/nodes/{id}" })
		.input(z.object({ id: z.uuid() }))
		.output(z.object({ success: z.boolean() }))
		.handler(async ({ input }) => {
			const result = await db
				.delete(nodes)
				.where(eq(nodes.id, input.id))
				.returning({ id: nodes.id });

			return { success: result.length > 0 };
		}),
};
