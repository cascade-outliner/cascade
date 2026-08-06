import { and, eq, gt } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { nodes } from "@/features/nodes/server/persistence/node-tables";
import { lockNodeOrdering } from "@/features/nodes/server/persistence/sibling-order";
import { requirePremium } from "@/features/premium/server/premium-access";
import {
	RESTORABLE_HISTORY_KINDS,
	type TreeHistoryPayload,
	type TreeHistoryRestoreResult,
	treeHistoryPayloadSchema,
} from "../../model/tree-history.schema";
import { createHistoryRecorder } from "../history-persistence";
import { treeHistoryEvents } from "../tree-history-table";
import { restoreContentChanged } from "./restore/restore-content-changed";
import { restoreDueDateChanged } from "./restore/restore-due-date-changed";
import { restoreIconChanged } from "./restore/restore-icon-changed";
import { restoreNodeMoved } from "./restore/restore-node-moved";
import { restorePriorityChanged } from "./restore/restore-priority-changed";
import { restoreRecurrenceChanged } from "./restore/restore-recurrence-changed";
import { restoreRecurringTaskCompleted } from "./restore/restore-recurring-task-completed";
import { restoreSubtreeDeleted } from "./restore/restore-subtree-deleted";
import { restoreTagDeleted } from "./restore/restore-tag-deleted";
import { restoreTagsChanged } from "./restore/restore-tags-changed";
import { restoreTypeChanged } from "./restore/restore-type-changed";
import { cutoff } from "./shared";

export const restoreTreeHistoryEntry = requirePremium
	.errors({
		NOT_FOUND: { status: 404, message: "History entry not found" },
		NOT_RESTORABLE: { status: 422, message: "History entry is not restorable" },
		INVALID_MOVE: { status: 422, message: "Restored location is invalid" },
	})
	.input(z.object({ id: z.string() }))
	.handler(
		async ({ input, context, errors }): Promise<TreeHistoryRestoreResult> => {
			const userId = context.user.id;
			const throwNotRestorable = (): never => {
				throw errors.NOT_RESTORABLE();
			};
			const throwInvalidMove = (): never => {
				throw errors.INVALID_MOVE();
			};
			return db.transaction(async (transaction) => {
				await lockNodeOrdering(transaction, userId);
				const [stored] = await transaction
					.select()
					.from(treeHistoryEvents)
					.where(
						and(
							eq(treeHistoryEvents.id, input.id),
							eq(treeHistoryEvents.userId, userId),
							gt(treeHistoryEvents.createdAt, cutoff()),
						),
					)
					.for("update");
				if (!stored) throw errors.NOT_FOUND();
				if (!RESTORABLE_HISTORY_KINDS.has(stored.kind)) {
					throw errors.NOT_RESTORABLE();
				}
				const payload = treeHistoryPayloadSchema.parse(stored.payload);
				const history = await createHistoryRecorder(transaction, userId);

				if (payload.kind === "tag_deleted") {
					return restoreTagDeleted(
						transaction,
						userId,
						payload,
						stored.id,
						history,
					);
				}

				if (payload.kind === "subtree_deleted") {
					return restoreSubtreeDeleted(
						transaction,
						userId,
						payload,
						stored.id,
						history,
						throwNotRestorable,
					);
				}

				const nodeId = stored.nodeId;
				if (!nodeId) throw errors.NOT_RESTORABLE();
				const [current] = await transaction
					.select()
					.from(nodes)
					.where(and(eq(nodes.id, nodeId), eq(nodes.userId, userId)))
					.for("update");
				if (!current)
					throw errors.NOT_FOUND({
						message: "Restore the node's deletion entry first",
					});

				let nextPayload: TreeHistoryPayload;
				switch (payload.kind) {
					case "content_changed":
						nextPayload = await restoreContentChanged(
							transaction,
							nodeId,
							current,
							payload,
						);
						break;
					case "type_changed":
						nextPayload = await restoreTypeChanged(
							transaction,
							nodeId,
							current,
							payload,
						);
						break;
					case "due_date_changed":
						nextPayload = await restoreDueDateChanged(
							transaction,
							nodeId,
							current,
							payload,
							throwNotRestorable,
						);
						break;
					case "icon_changed":
						nextPayload = await restoreIconChanged(
							transaction,
							nodeId,
							current,
							payload,
						);
						break;
					case "priority_changed":
						nextPayload = await restorePriorityChanged(
							transaction,
							nodeId,
							current,
							payload,
						);
						break;
					case "recurrence_changed":
						nextPayload = await restoreRecurrenceChanged(
							transaction,
							nodeId,
							current,
							payload,
							throwNotRestorable,
						);
						break;
					case "recurring_task_completed":
						nextPayload = await restoreRecurringTaskCompleted(
							transaction,
							nodeId,
							current,
							payload,
							throwNotRestorable,
						);
						break;
					case "tags_changed":
						nextPayload = await restoreTagsChanged(
							transaction,
							userId,
							nodeId,
							current,
							payload,
						);
						break;
					case "node_moved":
						nextPayload = await restoreNodeMoved(
							transaction,
							userId,
							nodeId,
							current,
							payload,
							throwInvalidMove,
						);
						break;
					default:
						throw errors.NOT_RESTORABLE();
				}

				const eventId = await history.record({
					nodeId,
					payload: nextPayload,
					restoredFromEventId: stored.id,
				});
				return { eventId: eventId as string, affectedNodeIds: [nodeId] };
			});
		},
	);
