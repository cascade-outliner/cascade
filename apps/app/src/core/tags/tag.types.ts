import type { InferSelectModel } from "drizzle-orm";
import type { NodeTypeName } from "@/core/nodes/node-types";
import type { tags } from "@/core/tags/tag.schema";

export type TagType = Pick<
	InferSelectModel<typeof tags>,
	"id" | "parentId" | "name" | "color"
> & {
	hasChildren: boolean;
};

/** Minimal shape embedded on node rows; avoid importing the full TagType elsewhere. */
export interface TagSummary {
	id: string;
	name: string;
	color: string;
	parentId: string | null;
}

/** A node row as returned by `tags.nodesForTag`; mirrors `NodeType` plus its tags. */
export interface TaggedNode {
	id: string;
	parentId: string | null;
	content: unknown;
	type: NodeTypeName;
	metadata: unknown;
	expanded: boolean;
	order: string;
	hasChildren: boolean;
	tags: TagSummary[];
}
