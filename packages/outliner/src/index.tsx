import { useOutlinerLabels } from "./i18n/outliner-labels-context";
import { VirtualTreeView } from "./tree/components/virtual-tree-view";
import { useTreeInteractions } from "./tree/hooks/use-tree-interactions";
import type { VirtualTreeProps } from "./tree/model/virtual-tree.types";

export type OutlinerProps = VirtualTreeProps;

/**
 * Core outliner entry point. It connects the consumer-owned tree operations
 * to editing, keyboard navigation, drag-and-drop, and virtualized rendering.
 */
export function Outliner({
	tree,
	indentSize,
	renderNodeLink,
	header,
	className,
	contentClassName,
	hiddenRowIds,
	contextRowIds,
	newNodeDueDate,
	newNodeTags,
	existingTags,
	onDeleteTag,
	onTagClick,
	features,
}: OutlinerProps) {
	const labels = useOutlinerLabels();
	const interactions = useTreeInteractions(tree, newNodeDueDate, newNodeTags);

	return (
		<VirtualTreeView
			tree={tree}
			labels={labels}
			scrollRef={interactions.scrollRef}
			virtualizer={interactions.virtualizer}
			virtualItems={interactions.virtualItems}
			editingNodeId={interactions.editingNodeId}
			focusPoint={interactions.focusPoint}
			indentSize={indentSize}
			renderNodeLink={renderNodeLink}
			header={header}
			className={className}
			contentClassName={contentClassName}
			hiddenRowIds={hiddenRowIds}
			contextRowIds={contextRowIds}
			existingTags={existingTags}
			onDeleteTag={onDeleteTag}
			onTagClick={onTagClick}
			features={features}
			onAddRoot={interactions.handleAddRoot}
			onMoveDrop={interactions.handleMoveDrop}
			onCreateBelow={interactions.handleCreateBelow}
			onDeleteEmpty={interactions.handleDeleteEmpty}
			onIndent={interactions.handleIndent}
			onOutdent={interactions.handleOutdent}
			onMoveUp={interactions.handleMoveUp}
			onMoveDown={interactions.handleMoveDown}
			onFocusNeighbor={interactions.handleFocusNeighbor}
			onStartEdit={interactions.handleStartEdit}
			onExitEdit={interactions.handleExitEdit}
			onConvert={interactions.handleConvert}
			onToggleTask={interactions.handleToggleTask}
		/>
	);
}

export type { VirtualTreeProps } from "./tree/model/virtual-tree.types";
