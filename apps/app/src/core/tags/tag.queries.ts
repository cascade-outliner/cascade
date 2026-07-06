import { eq, inArray, sql } from "drizzle-orm";
import { nodeTags, tags } from "@/core/tags/tag.schema";
import type { TagSummary } from "@/core/tags/tag.types";
import { db } from "@/db";

export const tagHasChildren = sql<boolean>`EXISTS (SELECT 1 FROM tags c WHERE c.parent_id = tags.id)`;

export const tagColumns = {
	id: tags.id,
	parentId: tags.parentId,
	name: tags.name,
	color: tags.color,
	hasChildren: tagHasChildren,
};

/**
 * Batch-loads tags for a set of nodes in a single query, grouped by node id.
 * Used wherever tag data is needed outside a raw-SQL CTE (e.g. `visibleTree`
 * uses an inline `json_agg` instead; this is for everywhere else) to avoid N+1.
 */
export async function getTagsForNodeIds(
	nodeIds: string[],
): Promise<Map<string, TagSummary[]>> {
	const byNode = new Map<string, TagSummary[]>();
	if (nodeIds.length === 0) return byNode;

	const rows = await db
		.select({
			nodeId: nodeTags.nodeId,
			id: tags.id,
			name: tags.name,
			color: tags.color,
			parentId: tags.parentId,
		})
		.from(nodeTags)
		.innerJoin(tags, eq(tags.id, nodeTags.tagId))
		.where(inArray(nodeTags.nodeId, nodeIds))
		.orderBy(sql`lower(${tags.name})`);

	for (const { nodeId, ...tag } of rows) {
		const existing = byNode.get(nodeId);
		if (existing) {
			existing.push(tag);
		} else {
			byNode.set(nodeId, [tag]);
		}
	}
	return byNode;
}
