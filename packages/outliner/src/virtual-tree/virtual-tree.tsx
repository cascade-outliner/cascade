import { useOutlinerLabels } from "../labels-context";
import type { VirtualTreeProps } from "./types";
import { useTreeInteractions } from "./use-tree-interactions";
import { VirtualTreeView } from "./virtual-tree-view";

export type { VirtualTreeProps } from "./types";

export function VirtualTree({
	tree,
	indentSize,
	renderNodeLink,
	header,
	className,
	contentClassName,
	hiddenRowIds,
	contextRowIds,
	newNodeDueDate,
	existingTags,
	onDeleteTag,
	onTagClick,
	onOpenVersionHistory,
	isPremium,
	features,
}: VirtualTreeProps) {
	const labels = useOutlinerLabels();
	const {
		scrollRef,
		virtualizer,
		virtualItems,
		editingNodeId,
		focusPoint,
		handleAddRoot,
		handleMoveDrop,
		handleCreateBelow,
		handleDeleteEmpty,
		handleIndent,
		handleOutdent,
		handleMoveUp,
		handleMoveDown,
		handleFocusNeighbor,
		handleStartEdit,
		handleExitEdit,
		handleConvert,
		handleToggleTask,
	} = useTreeInteractions(tree, newNodeDueDate);

	return (
		<VirtualTreeView
			tree={tree}
			labels={labels}
			scrollRef={scrollRef}
			virtualizer={virtualizer}
			virtualItems={virtualItems}
			editingNodeId={editingNodeId}
			focusPoint={focusPoint}
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
			onOpenVersionHistory={onOpenVersionHistory}
			isPremium={isPremium}
			features={features}
			onAddRoot={handleAddRoot}
			onMoveDrop={handleMoveDrop}
			onCreateBelow={handleCreateBelow}
			onDeleteEmpty={handleDeleteEmpty}
			onIndent={handleIndent}
			onOutdent={handleOutdent}
			onMoveUp={handleMoveUp}
			onMoveDown={handleMoveDown}
			onFocusNeighbor={handleFocusNeighbor}
			onStartEdit={handleStartEdit}
			onExitEdit={handleExitEdit}
			onConvert={handleConvert}
			onToggleTask={handleToggleTask}
		/>
	);
}
