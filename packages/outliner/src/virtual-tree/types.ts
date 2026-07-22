import type { ReactNode } from "react";
import type { OutlinerFeature } from "../features/types";
import type { BlockType } from "../lexical/lexical-content";
import type { LexicalElementNode } from "../lexical/read/lexical-read-view";
import type { FocusPoint } from "../node-editor";
import type { TagSummary } from "../node-tags";
import type { NodeTypeName, VisibleNodeRow } from "../node-types";
import type { VisibleTree } from "../tree-types";
import type { MoveTarget } from "./visible-rows";

export interface VirtualTreeProps {
	tree: VisibleTree;
	indentSize?: number;
	renderNodeLink?: (
		node: Pick<VisibleTree["rows"][number], "id" | "content">,
	) => ReactNode;
	header?: ReactNode;
	/** Overrides the scroll container's default full-viewport-height sizing. */
	className?: string;
	/** Overrides the inner content wrapper's default max-width/padding. */
	contentClassName?: string;
	/** Row ids to hide from view, e.g. rows excluded by an active filter. */
	hiddenRowIds?: Set<string>;
	/** Row ids to render dimmed but still visible, e.g. ancestors kept for context. */
	contextRowIds?: Set<string>;
	/** Stamped onto nodes created here, e.g. so a node added under an active
	 * "Due today" filter matches it instead of immediately being hidden. */
	newNodeDueDate?: Date | null;
	/** All of this user's tags with usage counts, for the tag editor. */
	existingTags?: TagSummary[];
	/** Deletes a tag outright (every node that has it loses it), not just
	 * one node's use of it. Not a `VisibleTree` mutation since it isn't
	 * scoped to this view's rows. Omit to hide the delete affordance. */
	onDeleteTag?: (name: string) => void | Promise<void>;
	/** Handles clicking a tag pill on a tree row, e.g. to activate a filter. */
	onTagClick?: (tag: string) => void;
	/** Opens the version-history modal for a node. Omit to hide the "Version
	 * history" context-menu item. */
	onOpenVersionHistory?: (nodeId: string) => void;
	/** Row/context-menu features to render, in order. Defaults to the
	 * built-in task, due-date, and tags features (`defaultOutlinerFeatures`). */
	features?: OutlinerFeature[];
}

export interface VirtualTreeRowProps {
	row: VisibleNodeRow;
	rows: VisibleNodeRow[];
	start: number;
	index: number;
	indentSize: number;
	renderNodeLink?: (node: Pick<VisibleNodeRow, "id" | "content">) => ReactNode;
	measureElement: (element: HTMLElement | null) => void;
	/** Row/context-menu features to render; see `VirtualTreeProps.features`. */
	features?: OutlinerFeature[];
	/** All of this user's tags with usage counts, for the tag editor. */
	existingTags: TagSummary[];
	/** Excluded by an active filter; rendered collapsed and out of the tab order. */
	isHidden: boolean;
	/** Not itself a filter match, but an ancestor of one; rendered dimmed. */
	isContext: boolean;
	editing: boolean;
	focusPoint: FocusPoint | null;
	onStartEdit: (point?: FocusPoint) => void;
	onExitEdit: () => void;
	onToggle: (expanded: boolean) => void;
	onConvert: (type: NodeTypeName) => void;
	onTurnInto: (blockType: BlockType) => void;
	onToggleTask: (completed: boolean) => void;
	onSetDueDate: (date: Date | null) => void;
	onSetTags: (tags: string[]) => void;
	onTagClick?: (tag: string) => void;
	onDeleteTag?: (name: string) => void | Promise<void>;
	onOpenVersionHistory?: (nodeId: string) => void;
	onDuplicate: () => void;
	onDelete: () => void;
	onSaveContent: (content: { root: LexicalElementNode }) => void;
	onCreateBelow: () => void;
	onDeleteEmpty: () => void;
	onIndent: () => void;
	onOutdent: () => void;
	onMoveUp: () => void;
	onMoveDown: () => void;
	onFocusNext: () => void;
	onFocusPrevious: () => void;
	onMoveDrop: (draggedId: string, target: MoveTarget) => void;
}
