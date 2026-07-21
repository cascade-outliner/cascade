import {
	ContextMenuSub,
	ContextMenuSubContent,
	ContextMenuSubTrigger,
} from "@cascade/ui/context-menu";
import { TagIcon } from "@phosphor-icons/react/ssr";
import { useOutlinerLabels } from "../../labels-context";
import { NodeTagsEditor } from "../../node-tags-editor/node-tags-editor";
import { NodeTagPills } from "../../node-tags-pills";
import type { OutlinerFeature, RowFeatureContext } from "../types";

function TagsMenuItem({ ctx }: { ctx: RowFeatureContext }) {
	const labels = useOutlinerLabels();
	return (
		<ContextMenuSub>
			<ContextMenuSubTrigger
				icon={<TagIcon size={14} weight="bold" />}
				openOnHover
				delay={150}
			>
				{ctx.row.tags.length > 0 ? labels.manageTags : labels.addTag}
			</ContextMenuSubTrigger>
			<ContextMenuSubContent>
				<NodeTagsEditor
					tags={ctx.row.tags}
					existingTags={ctx.existingTags}
					onChange={ctx.onSetTags}
					onDeleteTag={ctx.onDeleteTag}
				/>
			</ContextMenuSubContent>
		</ContextMenuSub>
	);
}

/** Tags: trailing pills plus a context-menu submenu for managing them. */
export const tagsFeature: OutlinerFeature = {
	id: "tags",
	renderTrailing: (ctx) => <NodeTagPills tags={ctx.row.tags} />,
	renderContextMenuItem: (ctx) => <TagsMenuItem ctx={ctx} />,
};
