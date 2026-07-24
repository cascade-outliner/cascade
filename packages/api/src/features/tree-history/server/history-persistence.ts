import { lexicalToPlainText } from "@cascade/outliner/lexical-content";
import type { NodeMetadata, NodeTypeName } from "@cascade/outliner/node-types";
import { and, asc, desc, eq, gt, lt, sql } from "drizzle-orm";
import {
	chunk,
	DUPLICATE_BATCH_SIZE,
} from "../../nodes/server/persistence/batch-inserts";
import { nodes } from "../../nodes/server/persistence/node-tables";
import {
	type NodeTransaction,
	siblingScope,
} from "../../nodes/server/persistence/sibling-order";
import { premiumSeats } from "../../premium/server/premium-table";
import type {
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
				n."order", n.due_date, 0 AS depth, ARRAY[n."order"] AS path
			FROM nodes n
			WHERE n.id = ${rootId} AND n.user_id = ${userId}
			UNION ALL
			SELECT c.id, c.parent_id, c.content, c.type, c.metadata, c.expanded,
				c."order", c.due_date, s.depth + 1, s.path || c."order"
			FROM nodes c
			JOIN subtree s ON c.parent_id = s.id
			WHERE c.user_id = ${userId}
		)
		SELECT s.id, s.parent_id, s.content, s.type, s.metadata, s.expanded,
			s."order", s.due_date::text AS due_date, s.depth,
			COALESCE(t.tags, '{}') AS tags
		FROM subtree s
		LEFT JOIN (
			SELECT nt.node_id, array_agg(tg.name ORDER BY tg.name) AS tags
			FROM node_tags nt
			JOIN tags tg ON tg.id = nt.tag_id
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

			for (const batch of chunk(snapshots, DUPLICATE_BATCH_SIZE)) {
				await transaction.insert(treeHistorySnapshots).values(
					batch.map((snapshot) => ({
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
						tags: snapshot.tags,
						depth: snapshot.depth,
						isRoot: snapshot.isRoot,
					})),
				);
			}
			return event.id;
		},
	};
}
