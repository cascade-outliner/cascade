import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { authed } from "@/orpc/context";
import { nodes } from "../persistence/node-tables";
import {
	lockNodeOrdering,
	orderAtTarget,
	siblingScope,
} from "../persistence/sibling-order";
import { ancestorsOf } from "../persistence/tree-cte";

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

async function destinationAncestors(
	transaction: Parameters<Parameters<typeof db.transaction>[0]>[0],
	parentId: string,
	userId: string,
): Promise<{ id: string }[]> {
	return (await transaction.execute(sql`
		WITH RECURSIVE ${ancestorsOf(parentId, userId)}
		SELECT id FROM chain
	`)) as unknown as { id: string }[];
}

export const moveNode = authed
	.errors({
		NOT_FOUND: { status: 404, message: "Node not found" },
		INVALID_MOVE: { status: 422, message: "Invalid move operation" },
	})
	.input(moveNodeInput)
	.handler(async ({ input, context, errors }) => {
		const userId = context.user.id;
		await db.transaction(async (transaction) => {
			await lockNodeOrdering(transaction, userId);

			const [moved] = await transaction
				.select({ id: nodes.id })
				.from(nodes)
				.where(and(eq(nodes.id, input.id), eq(nodes.userId, userId)))
				.for("update");
			if (!moved) throw errors.NOT_FOUND();

			if (input.parentId) {
				const ancestors = await destinationAncestors(
					transaction,
					input.parentId,
					userId,
				);
				if (ancestors.length === 0) throw errors.NOT_FOUND();
				if (ancestors.some(({ id }) => id === input.id)) {
					throw errors.INVALID_MOVE({
						message: "Cannot move a node into its own subtree",
					});
				}
			}

			const order = await orderAtTarget(
				transaction,
				siblingScope(userId, input.parentId),
				input,
			);
			if (order === undefined) {
				throw errors.INVALID_MOVE({ message: "Move target not found" });
			}
			await transaction
				.update(nodes)
				.set({ parentId: input.parentId, order })
				.where(and(eq(nodes.id, input.id), eq(nodes.userId, userId)));
		});
	});
