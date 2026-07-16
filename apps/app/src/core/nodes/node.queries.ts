import { type SQL, sql } from "drizzle-orm";
import { nodes } from "@/core/nodes/node.schema";

export const hasChildren = (userId: string) =>
	sql<boolean>`EXISTS (SELECT 1 FROM nodes c WHERE c.parent_id = nodes.id AND c.user_id = ${userId})`;

/** Sorted tag names of the node identified by `nodeId`, as a text[] (empty
 * when untagged). `nodeId` must be a raw, table-qualified SQL expression
 * (e.g. sql`nodes.id`) — a Drizzle column renders unqualified here and
 * would be captured by the subquery's own tables — so this composes into
 * both query-builder selects and raw CTEs. */
export const nodeTagNames = (nodeId: SQL) =>
	sql<
		string[]
	>`COALESCE((SELECT array_agg(t.name ORDER BY t.name) FROM node_tags nt JOIN tags t ON t.id = nt.tag_id WHERE nt.node_id = ${nodeId}), '{}')`;

export const nodeColumns = (userId: string) => ({
	id: nodes.id,
	parentId: nodes.parentId,
	content: nodes.content,
	type: nodes.type,
	metadata: nodes.metadata,
	expanded: nodes.expanded,
	order: nodes.order,
	dueDate: nodes.dueDate,
	tags: nodeTagNames(sql`nodes.id`),
	hasChildren: hasChildren(userId),
});
