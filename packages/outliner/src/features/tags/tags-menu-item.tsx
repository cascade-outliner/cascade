import {
	ContextMenuSub,
	ContextMenuSubContent,
	ContextMenuSubTrigger,
} from "@cascade/ui/context-menu";
import { TagIcon } from "@phosphor-icons/react/ssr";
import { useOutlinerLabels } from "../../labels-context";
import { NodeTagsEditor } from "../../node-tags-editor/node-tags-editor";
import type { TagsFeatureContext } from "./index";

export function TagsMenuItem({ ctx }: { ctx: TagsFeatureContext }) {
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
