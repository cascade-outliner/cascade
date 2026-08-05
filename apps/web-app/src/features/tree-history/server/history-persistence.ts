import { lexicalToPlainText } from "@cascade/outliner/lexical-content";
import type { NodeMetadata, NodeTypeName } from "@cascade/outliner/node-types";
import type { RecurrenceRule } from "@cascade/outliner/recurrence";
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
import { ancestorsOf } from "@/features/nodes/server/persistence/tree-cte";
import { premiumSeats } from "@/features/premium/server/premium-table";
import type {
	HistoryLocation,
	HistoryRestoreTarget,
	TreeHistoryPayload,
} from "../model/tree-history.schema";
import { treeHistoryEvents, treeHistorySnapshots } from "./tree-history-table";

export interface CapturedHistoryNode {
	nodeId: string;
	parentId: string | null;
	content: unknown;
	type: NodeTypeName;
	metadata: NodeMetadata | null;
	expanded: boolean;
	order: string;
	dueDate: string | null;
	recurrence: RecurrenceRule | null;
	icon: string | null;
	tags: string[];
	depth: number;
	isRoot: boolean;
	phase: "before" | "after";
}

interface CapturedSqlRow {
	id: string;
	parent_id: string | null;
	content: unknown;
	type: NodeTypeName;
	metadata: NodeMetadata | null;
	expanded: boolean;
	order: string;
	due_date: string | null;
	recurrence: RecurrenceRule | null;
	icon: string | null;
	depth: number;
	tags: string[];
}

export async function captureSubtree(
	transaction: NodeTransaction,
	rootId: string,
	userId: string,
	phase: "before" | "after",
): Promise<CapturedHistoryNode[]> {
	const rows = (await transaction.execute(sql`
		WITH RECURSIVE subtree AS (
			SELECT n.id, n.parent_id, n.content, n.type, n.metadata, n.expanded,
				n."order", n.due_date, n.recurrence, n.icon, 0 AS depth, ARRAY[n."order"] AS path
			FROM nodes n
			WHERE n.id = ${rootId} AND n.user_id = ${userId}
			UNION ALL
			SELECT c.id, c.parent_id, c.content, c.type, c.metadata, c.expanded,
				c."order", c.due_date, c.recurrence, c.icon, s.depth + 1, s.path || c."order"
			FROM nodes c
			JOIN subtree s ON c.parent_id = s.id
			WHERE c.user_id = ${userId}
		)
		SELECT s.id, s.parent_id, s.content, s.type, s.metadata, s.expanded,
			s."order", s.due_date::text AS due_date, s.recurrence, s.icon, s.depth,
			COALESCE(t.tags, '{}') AS tags
		FROM subtree s
		LEFT JOIN (
			SELECT nt.node_id, array_agg(tg.name ORDER BY tg.name) AS tags
			FROM node_tags nt
			JOIN tags tg ON tg.id = nt.tag_id AND tg.user_id = ${userId}
			WHERE nt.node_id IN (SELECT id FROM subtree)
			GROUP BY nt.node_id
		) t ON t.node_id = s.id
		ORDER BY s.path
	`)) as unknown as CapturedSqlRow[];

	return rows.map((row) => ({
		nodeId: row.id,
		parentId: row.parent_id,
		content: row.content,
		type: row.type,
		metadata: row.metadata,
		expanded: row.expanded,
		order: row.order,
		dueDate: row.due_date,
		recurrence: row.recurrence,
		icon: row.icon,
		tags: row.tags,
		depth: Number(row.depth),
		isRoot: row.id === rootId,
		phase,
	}));
}

export function historyNodeLabel(content: unknown): string {
	return lexicalToPlainText(content, 120);
}

export async function captureRestoreTarget(
	transaction: NodeTransaction,
	userId: string,
	parentId: string | null,
	order: string,
): Promise<HistoryRestoreTarget> {
	const scope = siblingScope(userId, parentId);
	const [previous] = await transaction
		.select({ id: nodes.id })
		.from(nodes)
		.where(and(scope, lt(nodes.order, order)))
		.orderBy(desc(nodes.order))
		.limit(1);
	if (previous) return { position: "after", targetId: previous.id };

	const [next] = await transaction
		.select({ id: nodes.id })
		.from(nodes)
		.where(and(scope, gt(nodes.order, order)))
		.orderBy(asc(nodes.order))
		.limit(1);
	if (next) return { position: "before", targetId: next.id };
	return { position: "append" };
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
				icon: snapshot.icon,
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
