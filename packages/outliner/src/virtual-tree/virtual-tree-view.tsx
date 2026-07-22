import { Button } from "@cascade/ui/button";
import { PlusIcon } from "@phosphor-icons/react";
import type { VirtualItem, Virtualizer } from "@tanstack/react-virtual";
import type { RefObject } from "react";
import { twMerge } from "tailwind-merge";
import type { OutlinerLabels } from "../labels-context";
import { setBlockType } from "../lexical/lexical-content";
import type { VisibleTree } from "../tree-types";
import type { VirtualTreeProps } from "./types";
import type { useTreeInteractions } from "./use-tree-interactions";
import { VirtualTreeRow } from "./virtual-tree-row";

type Interactions = ReturnType<typeof useTreeInteractions>;

export function VirtualTreeView({
	tree,
	labels,
	scrollRef,
	virtualizer,
	virtualItems,
	editingNodeId,
	focusPoint,
	indentSize,
	renderNodeLink,
	header,
	className,
	contentClassName,
	hiddenRowIds,
	contextRowIds,
	existingTags = [],
	onDeleteTag,
	onTagClick,
	onOpenVersionHistory,
	features,
	onAddRoot,
	onMoveDrop,
	onCreateBelow,
	onDeleteEmpty,
	onIndent,
	onOutdent,
	onMoveUp,
	onMoveDown,
	onFocusNeighbor,
	onStartEdit,
	onExitEdit,
	onConvert,
	onToggleTask,
}: Pick<
	VirtualTreeProps,
	| "indentSize"
	| "renderNodeLink"
	| "header"
	| "className"
	| "contentClassName"
	| "hiddenRowIds"
	| "contextRowIds"
	| "existingTags"
	| "onDeleteTag"
	| "onTagClick"
	| "onOpenVersionHistory"
	| "features"
> & {
	tree: VisibleTree;
	labels: OutlinerLabels;
	scrollRef: RefObject<HTMLDivElement | null>;
	virtualizer: Virtualizer<HTMLDivElement, Element>;
	virtualItems: VirtualItem[];
	editingNodeId: string | null;
	focusPoint: Interactions["focusPoint"];
	onAddRoot: Interactions["handleAddRoot"];
	onMoveDrop: Interactions["handleMoveDrop"];
	onCreateBelow: Interactions["handleCreateBelow"];
	onDeleteEmpty: Interactions["handleDeleteEmpty"];
	onIndent: Interactions["handleIndent"];
	onOutdent: Interactions["handleOutdent"];
	onMoveUp: Interactions["handleMoveUp"];
	onMoveDown: Interactions["handleMoveDown"];
	onFocusNeighbor: Interactions["handleFocusNeighbor"];
	onStartEdit: Interactions["handleStartEdit"];
	onExitEdit: Interactions["handleExitEdit"];
	onConvert: Interactions["handleConvert"];
	onToggleTask: Interactions["handleToggleTask"];
}) {
	return (
		<div ref={scrollRef} className={twMerge("h-dvh overflow-auto", className)}>
			<div
				className={twMerge("max-w-6xl mx-auto px-4 py-16", contentClassName)}
			>
				{header}
				{tree.rows.length === 0 ? (
					<p className="text-sm py-4">{labels.emptyTree}</p>
				) : hiddenRowIds?.size === tree.rows.length ? (
					<p className="text-sm py-4">{labels.emptyFilterResults}</p>
				) : (
					<div
						role="tree"
						aria-label={labels.treeLabel}
						style={{
							height: virtualizer.getTotalSize(),
							position: "relative",
						}}
					>
						{virtualItems.map((virtualItem) => {
							const row = tree.rows[virtualItem.index];
							if (!row) return null;
							return (
								<VirtualTreeRow
									key={virtualItem.key}
									row={row}
									rows={tree.rows}
									start={virtualItem.start}
									index={virtualItem.index}
									indentSize={indentSize ?? 16}
									renderNodeLink={renderNodeLink}
									measureElement={virtualizer.measureElement}
									existingTags={existingTags}
									onDeleteTag={onDeleteTag}
									onTagClick={onTagClick}
									onOpenVersionHistory={onOpenVersionHistory}
									features={features}
									isHidden={hiddenRowIds?.has(row.id) ?? false}
									isContext={contextRowIds?.has(row.id) ?? false}
									editing={editingNodeId === row.id}
									focusPoint={editingNodeId === row.id ? focusPoint : null}
									onStartEdit={(point) => onStartEdit(row.id, point)}
									onExitEdit={() => onExitEdit(row.id)}
									onToggle={(expanded) => tree.toggle(row.id, expanded)}
									onConvert={(type) => onConvert(row.id, type)}
									onTurnInto={(blockType) =>
										tree.updateContent(
											row.id,
											setBlockType(row.content, blockType),
										)
									}
									onToggleTask={(completed) => onToggleTask(row.id, completed)}
									onSetDueDate={(date) => tree.setDueDate(row.id, date)}
									onSetTags={(tags) => tree.setTags(row.id, tags)}
									onDuplicate={() => tree.duplicate(row.id)}
									onDelete={() => tree.remove(row.id)}
									onSaveContent={(content) =>
										tree.updateContent(row.id, content)
									}
									onCreateBelow={() => onCreateBelow(row.id)}
									onDeleteEmpty={() => onDeleteEmpty(row.id)}
									onIndent={() => onIndent(row.id)}
									onOutdent={() => onOutdent(row.id)}
									onMoveUp={() => onMoveUp(row.id)}
									onMoveDown={() => onMoveDown(row.id)}
									onFocusNext={() => onFocusNeighbor(row.id, 1)}
									onFocusPrevious={() => onFocusNeighbor(row.id, -1)}
									onMoveDrop={onMoveDrop}
								/>
							);
						})}
					</div>
				)}
				<Button
					icon={<PlusIcon className="size-4" />}
					onClick={onAddRoot}
					className="mt-4 mb-4"
				>
					{labels.addNode}
				</Button>
			</div>
		</div>
	);
}
