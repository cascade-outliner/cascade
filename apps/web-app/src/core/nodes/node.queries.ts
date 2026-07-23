import { type SQL, sql } from "drizzle-orm";
import { nodes } from "@/core/nodes/node.schema";

export const hasChildren = (userId: string) =>
	sql<boolean>`EXISTS (SELECT 1 FROM nodes c WHERE c.parent_id = nodes.id AND c.user_id = ${userId})`;

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
