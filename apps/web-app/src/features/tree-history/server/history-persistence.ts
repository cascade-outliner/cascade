import { lexicalToPlainText } from "@cascade/outliner/lexical-content";
import { and, asc, desc, eq, gt, lt, sql } from "drizzle-orm";
import {
	chunk,
	DUPLICATE_BATCH_SIZE,
	postgresBatchSize,
} from "@/features/nodes/server/persistence/batch-inserts";
import { nodes } from "@/features/nodes/server/persistence/node-tables";
import {
	type NodeTransaction,
	siblingScope,
} from "@/features/nodes/server/persistence/sibling-order";
import {
	type CapturedSubtreeNode,
	captureSubtreeRows,
} from "@/features/nodes/server/persistence/subtree-capture";
import { ancestorsOf } from "@/features/nodes/server/persistence/tree-cte";
import { premiumSeats } from "@/features/premium/server/premium-table";
import type {
	HistoryLocation,
	HistoryRestoreTarget,
	TreeHistoryPayload,
} from "../model/tree-history.schema";
import { treeHistoryEvents, treeHistorySnapshots } from "./tree-history-table";

export interface CapturedHistoryNode extends CapturedSubtreeNode {
	phase: "before" | "after";
}

/**
 * Every node in `rootId`'s subtree, tagged with which side of a change it
 * represents. Wraps the shared, phase-agnostic capture in
 * `subtree-capture.ts` (also used by deletion receipts) so both capture
 * with one query instead of two.
 */
export async function captureSubtree(
	transaction: NodeTransaction,
	rootId: string,
	userId: string,
	phase: "before" | "after",
): Promise<CapturedHistoryNode[]> {
	const rows = await captureSubtreeRows(transaction, rootId, userId);
	return rows.map((row) => ({ ...row, phase }));
}

export function historyNodeLabel(content: unknown): string {
	return lexicalToPlainText(content, 120);
}

export async function captureHistoryLocation(
	transaction: NodeTransaction,
	userId: string,
	parentId: string | null,
	order: string,
	target?: HistoryRestoreTarget,
): Promise<HistoryLocation> {
	const scope = siblingScope(userId, parentId);
	const [previous] = await transaction
		.select({ id: nodes.id, content: nodes.content })
		.from(nodes)
		.where(and(scope, lt(nodes.order, order)))
		.orderBy(desc(nodes.order))
		.limit(1);
	const [next] = await transaction
		.select({ id: nodes.id, content: nodes.content })
		.from(nodes)
		.where(and(scope, gt(nodes.order, order)))
		.orderBy(asc(nodes.order))
		.limit(1);
	const breadcrumb = parentId
		? (
				(await transaction.execute(sql`
					WITH RECURSIVE ${ancestorsOf(parentId, userId)}
					SELECT content FROM chain ORDER BY depth DESC
				`)) as unknown as { content: unknown }[]
			).map(({ content }) => historyNodeLabel(content))
		: [];

	return {
		parentId,
		target:
			target ??
			(previous
				? { position: "after", targetId: previous.id }
				: next
					? { position: "before", targetId: next.id }
					: { position: "append" }),
		context: {
			breadcrumb,
			previousSibling: previous ? historyNodeLabel(previous.content) : null,
			nextSibling: next ? historyNodeLabel(next.content) : null,
		},
	};
}

export interface HistoryRecorder {
	enabled: boolean;
	record: (input: {
		nodeId: string | null;
		payload: TreeHistoryPayload;
		snapshots?: CapturedHistoryNode[];
		restoredFromEventId?: string | null;
	}) => Promise<string | null>;
}

export async function createHistoryRecorder(
	transaction: NodeTransaction,
	userId: string,
): Promise<HistoryRecorder> {
	const [seat] = await transaction
		.select({ userId: premiumSeats.userId })
		.from(premiumSeats)
		.where(eq(premiumSeats.userId, userId))
		.limit(1);
	const enabled = !!seat;

	return {
		enabled,
		record: async ({
			nodeId,
			payload,
			snapshots = [],
			restoredFromEventId = null,
		}) => {
			if (!enabled) return null;
			const [event] = await transaction
				.insert(treeHistoryEvents)
				.values({
					userId,
					kind: payload.kind,
					nodeId,
					payload,
					restoredFromEventId,
				})
				.returning({ id: treeHistoryEvents.id });
			if (!event) return null;

			const snapshotValues = snapshots.map((snapshot) => ({
				eventId: event.id,
				phase: snapshot.phase,
				nodeId: snapshot.nodeId,
				parentId: snapshot.parentId,
				content: snapshot.content,
				type: snapshot.type,
				metadata: snapshot.metadata,
				expanded: snapshot.expanded,
				order: snapshot.order,
				dueDate: snapshot.dueDate,
				recurrence: snapshot.recurrence,
				tags: snapshot.tags,
				depth: snapshot.depth,
				isRoot: snapshot.isRoot,
			}));
			const parametersPerSnapshot = Object.keys(snapshotValues[0] ?? {}).length;
			const snapshotBatchSize =
				parametersPerSnapshot > 0
					? Math.min(
							DUPLICATE_BATCH_SIZE,
							postgresBatchSize(parametersPerSnapshot),
						)
					: DUPLICATE_BATCH_SIZE;
			for (const batch of chunk(snapshotValues, snapshotBatchSize)) {
				await transaction.insert(treeHistorySnapshots).values(batch);
			}
			return event.id;
		},
	};
}
