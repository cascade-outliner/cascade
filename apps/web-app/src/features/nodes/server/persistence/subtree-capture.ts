import type { NodeMetadata, NodeTypeName } from "@cascade/outliner/node-types";
import type { RecurrenceRule } from "@cascade/outliner/recurrence";
import { and, asc, desc, gt, lt, sql } from "drizzle-orm";
import { nodes } from "./node-tables";
import type { NodeTransaction } from "./sibling-order";
import { siblingScope } from "./sibling-order";

export interface CapturedSubtreeNode {
	nodeId: string;
	parentId: string | null;
	content: unknown;
	type: NodeTypeName;
	metadata: NodeMetadata | null;
	expanded: boolean;
	order: string;
	dueDate: string | null;
	recurrence: RecurrenceRule | null;
	tags: string[];
	depth: number;
	isRoot: boolean;
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
	depth: number;
	tags: string[];
}

/**
 * Every node in `rootId`'s subtree (root included), regardless of collapse
 * state — a single recursive CTE, not the paginated `visibleTree` walk, so
 * it never depends on what the client has loaded or expanded. Shared by
 * deletion receipts (`deletion-receipt-persistence.ts`) and premium tree
 * history (`history-persistence.ts`'s `captureSubtree`, which wraps this
 * with a "before"/"after" phase tag) so both capture with one query instead
 * of two.
 */
export async function captureSubtreeRows(
	transaction: NodeTransaction,
	rootId: string,
	userId: string,
): Promise<CapturedSubtreeNode[]> {
	const rows = (await transaction.execute(sql`
		WITH RECURSIVE subtree AS (
			SELECT n.id, n.parent_id, n.content, n.type, n.metadata, n.expanded,
				n."order", n.due_date, n.recurrence, 0 AS depth, ARRAY[n."order"] AS path
			FROM nodes n
			WHERE n.id = ${rootId} AND n.user_id = ${userId}
			UNION ALL
			SELECT c.id, c.parent_id, c.content, c.type, c.metadata, c.expanded,
				c."order", c.due_date, c.recurrence, s.depth + 1, s.path || c."order"
			FROM nodes c
			JOIN subtree s ON c.parent_id = s.id
			WHERE c.user_id = ${userId}
		)
		SELECT s.id, s.parent_id, s.content, s.type, s.metadata, s.expanded,
			s."order", s.due_date::text AS due_date, s.recurrence, s.depth,
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
		recurrence: row.recurrence,
		tags: row.tags,
		depth: Number(row.depth),
		isRoot: row.id === rootId,
	}));
}

/** The sibling position immediately surrounding `order` in `parentId`, as a restore target. */
export async function captureRestoreTarget(
	transaction: NodeTransaction,
	userId: string,
	parentId: string | null,
	order: string,
): Promise<
	{ position: "before" | "after"; targetId: string } | { position: "append" }
> {
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
