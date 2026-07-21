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
		selection,
		handleRowSelect,
		marqueeRect,
		onMarqueePointerDown,
		handleBulkMoveDrop,
		handleBulkRemove,
		handleBulkAddTag,
		handleBulkRemoveTag,
		handleBulkSetDueDate,
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
			selection={selection}
			onRowSelect={handleRowSelect}
			marqueeRect={marqueeRect}
			onMarqueePointerDown={onMarqueePointerDown}
			onBulkMoveDrop={handleBulkMoveDrop}
			onBulkRemove={handleBulkRemove}
			onBulkAddTag={handleBulkAddTag}
			onBulkRemoveTag={handleBulkRemoveTag}
			onBulkSetDueDate={handleBulkSetDueDate}
		/>
	);
}
