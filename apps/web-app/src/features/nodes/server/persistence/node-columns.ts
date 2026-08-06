import type { StatusSummary } from "@cascade/outliner/node-statuses";
import { type SQL, sql } from "drizzle-orm";
import { nodes } from "@/features/nodes/server/persistence/node-tables";

export const hasChildren = (userId: string) =>
	sql<boolean>`EXISTS (SELECT 1 FROM nodes c WHERE c.parent_id = nodes.id AND c.user_id = ${userId})`;

export const nodeTagNames = (nodeId: SQL) =>
	sql<
		string[]
	>`COALESCE((SELECT array_agg(t.name ORDER BY t.name) FROM node_tags nt JOIN tags t ON t.id = nt.tag_id WHERE nt.node_id = ${nodeId}), '{}')`;

/** The node's status denormalized into the shape clients render (#576). */
export const nodeStatus = sql<StatusSummary | null>`(
	SELECT json_build_object('id', s.id, 'name', s.name, 'color', s.color)
	FROM statuses s WHERE s.id = nodes.status_id
)`;

export const nodeColumns = (userId: string) => ({
	id: nodes.id,
	parentId: nodes.parentId,
	content: nodes.content,
	type: nodes.type,
	metadata: nodes.metadata,
	expanded: nodes.expanded,
	order: nodes.order,
	dueDate: nodes.dueDate,
	dueTime: nodes.dueTime,
	recurrence: nodes.recurrence,
	icon: nodes.icon,
	priority: nodes.priority,
	status: nodeStatus,
	tags: nodeTagNames(sql`nodes.id`),
	hasChildren: hasChildren(userId),
});
