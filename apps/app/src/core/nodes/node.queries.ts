import { sql } from "drizzle-orm";
import { nodes } from "@/core/nodes/node.schema";

export const hasChildren = sql<boolean>`EXISTS (SELECT 1 FROM nodes c WHERE c.parent_id = nodes.id)`;

export const nodeColumns = {
	id: nodes.id,
	parentId: nodes.parentId,
	content: nodes.content,
	type: nodes.type,
	metadata: nodes.metadata,
	expanded: nodes.expanded,
	order: nodes.order,
	dueDate: nodes.dueDate,
	hasChildren,
};
