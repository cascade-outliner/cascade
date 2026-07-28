import { eq } from "drizzle-orm";
import { db } from "@/db";
import { restoreNodeInputSchema } from "@/features/nodes/model/subtree-snapshot.schema";
import { nodeColumns } from "@/features/nodes/server/persistence/node-columns";
import { nodes } from "@/features/nodes/server/persistence/node-tables";
import { lockNodeOrdering } from "@/features/nodes/server/persistence/sibling-order";
import { restoreSnapshotWithFallback } from "@/features/nodes/server/persistence/subtree-restore";
import {
	captureSubtree,
	createHistoryRecorder,
	historyNodeLabel,
} from "@/features/tree-history/server/history-persistence";
import { authed } from "@/orpc/context";

/**
 * Reinserts a node and its full subtree with their original ids, content,
 * and tags — the undo of `deleteNode`, built from a snapshot the client held
 * onto from just before the delete ran. The root's order is recomputed
 * against `target`'s *current* siblings, since its old slot (or even its old
 * parent) may no longer exist; descendants keep their original `order`
 * values since their parent ids are exclusive to this subtree and can't
 * collide with anything created since the delete.
 *
 * Shares its placement-fallback and id-collision handling with deletion
 * receipts and premium tree-history's restore
 * (`restoreSnapshotWithFallback`), so a missing parent/anchor or a
 * colliding id behaves identically regardless of which of the three restore
 * entry points is used. See docs/research/535-node-deletion-lifecycle.md.
 */
export const restoreNode = authed
	.errors({
		ID_COLLISION: {
			status: 409,
			message: "Restore target ids already exist",
		},
	})
	.input(restoreNodeInputSchema)
	.handler(async ({ input, context, errors }) => {
		const userId = context.user.id;
		const { parentId, target, root, descendants } = input;

		return await db.transaction(async (tx) => {
			await lockNodeOrdering(tx, userId);
			const history = await createHistoryRecorder(tx, userId);

			const outcome = await restoreSnapshotWithFallback(tx, {
				userId,
				parentId,
				target,
				root,
				descendants,
			});
			if (!outcome.ok) throw errors.ID_COLLISION();

			const [created] = await tx
				.select(nodeColumns(userId))
				.from(nodes)
				.where(eq(nodes.id, root.id))
				.limit(1);
			if (created) {
				await history.record({
					nodeId: created.id,
					payload: {
						kind: "subtree_restored",
						label: historyNodeLabel(created.content),
						count: descendants.length + 1,
					},
					snapshots: history.enabled
						? await captureSubtree(tx, created.id, userId, "after")
						: [],
				});
			}
			return { ...created, placement: outcome.placement };
		});
	});
