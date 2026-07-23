import { randomUUID } from "node:crypto";
import type { CalendarDateString } from "@cascade/outliner/calendar-date";
import type { NodeMetadata, NodeTypeName } from "@cascade/outliner/node-types";
import { inArray, sql } from "drizzle-orm";
import { chunk, DUPLICATE_BATCH_SIZE } from "./batch-inserts";
import { nodes, nodeTags } from "./node-tables";
import type { NodeTransaction } from "./sibling-order";

interface SubtreeRow {
	id: string;
	parent_id: string | null;
	content: unknown;
	type: NodeTypeName;
	metadata: unknown;
	expanded: boolean;
	order: string;
	due_date: CalendarDateString | null;
}

export interface PreparedSubtreeCopy {
	rows: SubtreeRow[];
	idMap: Map<string, string>;
	newRootId: string;
}

export async function prepareSubtreeCopy(
	transaction: NodeTransaction,
	sourceId: string,
	userId: string,
): Promise<PreparedSubtreeCopy> {
	const rows = (await transaction.execute(sql`
		WITH RECURSIVE subtree AS (
			SELECT id, parent_id, content, type, metadata, expanded, "order", due_date
			FROM nodes WHERE id = ${sourceId} AND user_id = ${userId}
			UNION ALL
			SELECT c.id, c.parent_id, c.content, c.type, c.metadata, c.expanded, c."order", c.due_date
			FROM nodes c
			JOIN subtree s ON c.parent_id = s.id
			WHERE c.user_id = ${userId}
		)
		SELECT * FROM subtree
	`)) as unknown as SubtreeRow[];
	const idMap = new Map(rows.map((row) => [row.id, randomUUID()]));
	return {
		rows,
		idMap,
		newRootId: idMap.get(sourceId) as string,
	};
}

async function copyTags(
	transaction: NodeTransaction,
	sourceIds: string[],
	idMap: Map<string, string>,
): Promise<void> {
	const sourceTags: { nodeId: string; tagId: string }[] = [];
	for (const idBatch of chunk(sourceIds, DUPLICATE_BATCH_SIZE)) {
		sourceTags.push(
			...(await transaction
				.select({ nodeId: nodeTags.nodeId, tagId: nodeTags.tagId })
				.from(nodeTags)
				.where(inArray(nodeTags.nodeId, idBatch))),
		);
	}

	const copiedTags = sourceTags.map(({ nodeId, tagId }) => ({
		nodeId: idMap.get(nodeId) as string,
		tagId,
	}));
	for (const batch of chunk(copiedTags, DUPLICATE_BATCH_SIZE)) {
		await transaction.insert(nodeTags).values(batch);
	}
}

export async function insertSubtreeCopy(
	transaction: NodeTransaction,
	{
		prepared,
		sourceId,
		userId,
		parentId,
		rootOrder,
	}: {
		prepared: PreparedSubtreeCopy;
		sourceId: string;
		userId: string;
		parentId: string | null;
		rootOrder: string;
	},
): Promise<void> {
	const copiedNodes = prepared.rows.map((row) => ({
		id: prepared.idMap.get(row.id) as string,
		parentId:
			row.id === sourceId
				? parentId
				: (prepared.idMap.get(row.parent_id as string) ?? null),
		userId,
		content: row.content,
		type: row.type,
		metadata: row.metadata as NodeMetadata,
		expanded: row.expanded,
		order: row.id === sourceId ? rootOrder : row.order,
		dueDate: row.due_date,
	}));
	for (const batch of chunk(copiedNodes, DUPLICATE_BATCH_SIZE)) {
		await transaction.insert(nodes).values(batch);
	}

	await copyTags(
		transaction,
		prepared.rows.map((row) => row.id),
		prepared.idMap,
	);
}
