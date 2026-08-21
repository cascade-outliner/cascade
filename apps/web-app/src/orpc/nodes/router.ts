import { db, nodeQueries } from "@cascade/db";
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
			return { nodes: await nodeQueries.list(db, context.userId) };
		}),

	get: authed
		.route({ method: "GET", path: "/nodes/{id}" })
		.errors({ NOT_FOUND: {} })
		.input(z.object({ id: z.uuid() }))
		.output(nodeSchema)
		.handler(async ({ input, context, errors }) => {
			const node = await nodeQueries.get(db, context.userId, input.id);

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
			return await nodeQueries.create(db, context.userId, input);
		}),

	update: authed
		.route({ method: "PATCH", path: "/nodes/{id}" })
		.errors({ NOT_FOUND: {} })
		.input(nodeInput.partial().extend({ id: z.uuid() }))
		.output(nodeSchema)
		.handler(async ({ input, context, errors }) => {
			const { id, ...values } = input;
			const node = await nodeQueries.update(db, context.userId, id, values);

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
			const success = await nodeQueries.delete(db, context.userId, input.id);
			return { success };
		}),
};
