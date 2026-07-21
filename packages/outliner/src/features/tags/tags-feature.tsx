import {
	ContextMenuSub,
	ContextMenuSubContent,
	ContextMenuSubTrigger,
} from "@cascade/ui/context-menu";
import { TagIcon } from "@phosphor-icons/react/ssr";
import { useOutlinerLabels } from "../../labels-context";
import type { TagSummary } from "../../node-tags";
import { NodeTagsEditor } from "../../node-tags-editor/node-tags-editor";
import { NodeTagPills } from "../../node-tags-pills";
import type { OutlinerFeature } from "../types";

export interface TagsFeatureContext {
	tags: string[];
	existingTags: TagSummary[];
	onSetTags: (tags: string[]) => void;
	onDeleteTag?: (name: string) => void | Promise<void>;
}

function TagsMenuItem({ ctx }: { ctx: TagsFeatureContext }) {
	const labels = useOutlinerLabels();
	return (
		<ContextMenuSub>
			<ContextMenuSubTrigger
				icon={<TagIcon size={14} weight="bold" />}
				openOnHover
				delay={150}
			>
				{ctx.tags.length > 0 ? labels.manageTags : labels.addTag}
			</ContextMenuSubTrigger>
			<ContextMenuSubContent>
				<NodeTagsEditor
					tags={ctx.tags}
					existingTags={ctx.existingTags}
					onChange={ctx.onSetTags}
					onDeleteTag={ctx.onDeleteTag}
				/>
			</ContextMenuSubContent>
		</ContextMenuSub>
	);
}

/** Tags: trailing pills plus a context-menu submenu for managing them. */
export const tagsFeature: OutlinerFeature<TagsFeatureContext> = {
	id: "tags",
	renderTrailing: (ctx) => <NodeTagPills tags={ctx.tags} />,
	renderContextMenuItem: (ctx) => <TagsMenuItem ctx={ctx} />,
};
