import type { NodeTypeName } from "@/core/nodes/node-types";
import type { TaggedNode, TagSummary } from "@/core/tags/tag.types";
import type { LexicalElementNode } from "@/ui/lexical/read/lexical-read-view";
import { NodeActions } from "@/ui/nodes/node-actions";
import { NodeCheckbox } from "@/ui/nodes/node-checkbox";
import { type FocusPoint, NodeEditor } from "@/ui/nodes/node-editor";
import { NodeLink } from "@/ui/nodes/node-link";
import { TagChip } from "@/ui/tags/tag-chip";

interface TagFilteredNodeRowProps {
	row: TaggedNode;
	editing: boolean;
	focusPoint: FocusPoint | null;
	onStartEdit: (point?: FocusPoint) => void;
	onExitEdit: () => void;
	onSaveContent: (content: { root: LexicalElementNode }) => void;
	onConvert: (type: NodeTypeName) => void;
	onToggleTask: (completed: boolean) => void;
	onDelete: () => void;
	onAddTag: (tag: TagSummary) => void;
	onRemoveTag: (tagId: string) => void;
}

/**
 * Editable row for the tag-filtered list: same building blocks as
 * VirtualTreeRow (link, checkbox, editor, actions, tag chips), minus the
 * tree-only mechanics (toggle/indent/drag) that don't apply to a flat,
 * cross-parent list of nodes.
 */
export function TagFilteredNodeRow({
	row,
	editing,
	focusPoint,
	onStartEdit,
	onExitEdit,
	onSaveContent,
	onConvert,
	onToggleTask,
	onDelete,
	onAddTag,
	onRemoveTag,
}: TagFilteredNodeRowProps) {
	return (
		<div className="py-1">
			<NodeActions
				nodeType={row.type}
				tags={row.tags}
				onConvert={onConvert}
				onDelete={onDelete}
				onAddTag={onAddTag}
				onRemoveTag={onRemoveTag}
				viewTransitionName={`node-${row.id}`}
			>
				<NodeLink id={row.id} />
				{row.type === "task" && (
					<NodeCheckbox metadata={row.metadata} onToggle={onToggleTask} />
				)}
				<div className="block w-full">
					<NodeEditor
						id={row.id}
						content={row.content}
						editing={editing}
						focusPoint={focusPoint}
						onStartEdit={onStartEdit}
						onExit={onExitEdit}
						onSave={onSaveContent}
					/>
				</div>
				{row.tags.length > 0 && (
					<div className="flex flex-wrap items-center gap-1 shrink-0">
						{row.tags.map((tag) => (
							<TagChip
								key={tag.id}
								tag={tag}
								onRemove={() => onRemoveTag(tag.id)}
							/>
						))}
					</div>
				)}
			</NodeActions>
		</div>
	);
}
