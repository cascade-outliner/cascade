import { db, nodes } from "@cascade/db";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { authed } from "../authed.ts";

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
	content: z.unknown().nullish(),
	expanded: z.boolean().optional(),
});

export const nodesRouter = {
	list: authed
		.route({ method: "GET", path: "/nodes" })
		.output(z.object({ nodes: z.array(nodeSchema) }))
		.handler(async ({ context }) => {
			return {
				nodes: await db
					.select()
					.from(nodes)
					.where(eq(nodes.userId, context.userId)),
			};
		}),

	get: authed
		.route({ method: "GET", path: "/nodes/{id}" })
		.errors({ NOT_FOUND: {} })
		.input(z.object({ id: z.uuid() }))
		.output(nodeSchema)
		.handler(async ({ input, context, errors }) => {
			const [node] = await db
				.select()
				.from(nodes)
				.where(and(eq(nodes.id, input.id), eq(nodes.userId, context.userId)));

			if (!node) {
				throw errors.NOT_FOUND();
			}

			return node;
		}),

	create: authed
		.route({ method: "POST", path: "/nodes" })
		.input(nodeInput)
		.output(nodeSchema)
		.handler(async ({ input, context }) => {
			const [node] = await db
				.insert(nodes)
				.values({ ...input, userId: context.userId })
				.returning();
			return node;
		}),

	update: authed
		.route({ method: "PATCH", path: "/nodes/{id}" })
		.errors({ NOT_FOUND: {} })
		.input(nodeInput.partial().extend({ id: z.uuid() }))
		.output(nodeSchema)
		.handler(async ({ input, context, errors }) => {
			const { id, ...values } = input;
			const [node] = await db
				.update(nodes)
				.set(values)
				.where(and(eq(nodes.id, id), eq(nodes.userId, context.userId)))
				.returning();

			if (!node) {
				throw errors.NOT_FOUND();
			}

			return node;
		}),

	delete: authed
		.route({ method: "DELETE", path: "/nodes/{id}" })
		.input(z.object({ id: z.uuid() }))
		.output(z.object({ success: z.boolean() }))
		.handler(async ({ input, context }) => {
			const result = await db
				.delete(nodes)
				.where(and(eq(nodes.id, input.id), eq(nodes.userId, context.userId)))
				.returning({ id: nodes.id });

			return { success: result.length > 0 };
		}),
};
