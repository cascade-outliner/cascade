import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { restoreNodeInputSchema } from "@/features/nodes/model/subtree-snapshot.schema";
import { nodeColumns } from "@/features/nodes/server/persistence/node-columns";
import { nodes } from "@/features/nodes/server/persistence/node-tables";
import {
	lockNodeOrdering,
	orderAtTarget,
	siblingScope,
} from "@/features/nodes/server/persistence/sibling-order";
import { restoreSubtree } from "@/features/nodes/server/persistence/subtree-restore";
import { authed } from "@/orpc/context";

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
			await lockNodeOrdering(tx, userId);

			if (parentId !== null) {
				const [parent] = await tx
					.select({ id: nodes.id })
					.from(nodes)
					.where(and(eq(nodes.id, parentId), eq(nodes.userId, userId)))
					.limit(1);
				if (!parent) throw errors.NOT_FOUND();
			}

			const order = await orderAtTarget(
				tx,
				siblingScope(userId, parentId),
				target,
			);
			if (order === undefined) throw errors.INVALID_MOVE();

			await restoreSubtree(tx, {
				userId,
				parentId,
				order,
				root,
				descendants,
			});

			const [created] = await tx
				.select(nodeColumns(userId))
				.from(nodes)
				.where(eq(nodes.id, root.id))
				.limit(1);
			return created;
		});
	});
