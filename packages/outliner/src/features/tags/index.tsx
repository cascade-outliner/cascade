import type { TagSummary } from "../../node-tags";
import type { OutlinerFeature } from "../types";
import { NodeTagPills } from "./node-tags-pills";
import { TagsMenuItem } from "./tags-menu-item";

export interface TagsFeatureContext {
	tags: string[];
	existingTags: TagSummary[];
	onSetTags: (tags: string[]) => void;
	onTagClick?: (tag: string) => void;
	onDeleteTag?: (name: string) => void | Promise<void>;
}

/** Tags: trailing pills plus a context-menu submenu for managing them. */
export const tagsFeature: OutlinerFeature<TagsFeatureContext> = {
	id: "tags",
	renderTrailing: (ctx) => (
		<NodeTagPills tags={ctx.tags} onTagClick={ctx.onTagClick} />
	),
	renderContextMenuItem: (ctx) => <TagsMenuItem ctx={ctx} />,
};
