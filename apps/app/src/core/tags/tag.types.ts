import type { InferSelectModel } from "drizzle-orm";
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
