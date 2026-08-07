import { Button } from "@cascade/ui/button";
import { PlusIcon } from "@phosphor-icons/react";
import type { VirtualItem, Virtualizer } from "@tanstack/react-virtual";
import { type RefObject, useLayoutEffect } from "react";
import { twMerge } from "tailwind-merge";
import { setBlockType } from "../../editor/lexical/content/lexical-content";
import type { OutlinerLabels } from "../../i18n/outliner-labels-context";
import type { useTreeInteractions } from "../hooks/use-tree-interactions";
import type { VisibleTree } from "../model/tree.types";
import type { VirtualTreeProps } from "../model/virtual-tree.types";
import {
	clearExpansionReveal,
	getExpansionReveal,
} from "../motion/expansion-reveal";
import { RowErrorBoundary } from "./row-error-boundary";
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
	completionExitRowIds,
	contextRowIds,
	noVisibleChildrenRowIds,
	existingTags = [],
	onDeleteTag,
	onTagClick,
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
	| "completionExitRowIds"
	| "contextRowIds"
	| "noVisibleChildrenRowIds"
	| "existingTags"
	| "onDeleteTag"
	| "onTagClick"
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
	const expansionRevealRowIds = getExpansionReveal(
		virtualItems.flatMap((item) => {
			const id = tree.rows[item.index]?.id;
			return id ? [id] : [];
		}),
	);
	useLayoutEffect(() => {
		clearExpansionReveal();
	});

	return (
		<div
			ref={scrollRef}
			className={twMerge("isolate h-dvh overflow-auto", className)}
		>
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
								<RowErrorBoundary
									key={virtualItem.key}
									row={row}
									start={virtualItem.start}
									index={virtualItem.index}
									indentSize={indentSize ?? 16}
									measureElement={virtualizer.measureElement}
									labels={labels}
									onDelete={() => tree.remove(row.id)}
								>
									<VirtualTreeRow
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
										features={features}
										isHidden={hiddenRowIds?.has(row.id) ?? false}
										isCompletionExiting={
											completionExitRowIds?.has(row.id) ?? false
										}
										isContext={contextRowIds?.has(row.id) ?? false}
										hasVisibleChildren={
											!(noVisibleChildrenRowIds?.has(row.id) ?? false)
										}
										revealOnMount={expansionRevealRowIds.has(row.id)}
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
										onToggleTask={(completed) =>
											onToggleTask(row.id, completed)
										}
										onSetDueDate={(date, time) =>
											tree.setDueDate(row.id, date, time)
										}
										onSetRecurrence={(recurrence) =>
											tree.setRecurrence(row.id, recurrence)
										}
										onSetTags={(tags) => tree.setTags(row.id, tags)}
										onSetIcon={(icon) => tree.setIcon(row.id, icon)}
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
								</RowErrorBoundary>
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
