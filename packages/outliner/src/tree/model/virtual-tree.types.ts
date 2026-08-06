import type { ReactNode } from "react";
import type { CalendarTimeString } from "../../dates/calendar-time";
import type { RecurrenceInput } from "../../dates/recurrence";
import type { BlockType } from "../../editor/lexical/content/lexical-content";
import type { LexicalElementNode } from "../../editor/lexical/model/lexical-node.types";
import type { FocusPoint } from "../../editor/model/focus-point";
import type { OutlinerFeature } from "../../features/model/outliner-feature.types";
import type { PriorityName } from "../../nodes/model/node-priority";
import type { StatusSummary } from "../../nodes/model/node-statuses";
import type { TagSummary } from "../../nodes/model/node-tags";
import type {
	NodeTypeName,
	VisibleNodeRow,
} from "../../nodes/model/node-types";
import type { MoveTarget } from "../rows/visible-rows";
import type { VisibleTree } from "./tree.types";

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
	/** Directly completed task ids fading out before hide-completed removes them. */
	completionExitRowIds?: Set<string>;
	/** Row ids to render dimmed but still visible, e.g. ancestors kept for context. */
	contextRowIds?: Set<string>;
	/** Row ids whose children are all hidden by an active filter; their
	 * expand chevron is suppressed since expanding would reveal nothing. */
	noVisibleChildrenRowIds?: Set<string>;
	/** Stamped onto nodes created here, e.g. so a node added under an active
	 * due-date filter matches it instead of immediately being hidden. */
	newNodeDueDate?: Date | null;
	/** Stamped onto nodes created here, e.g. so a node added under an active
	 * tag filter matches it instead of immediately being hidden. */
	newNodeTags?: string[];
	/** All of this user's tags with usage counts, for the tag editor. */
	existingTags?: TagSummary[];
	/** All of this user's statuses, for the status picker and filters. */
	existingStatuses?: StatusSummary[];
	/** Deletes a tag outright (every node that has it loses it), not just
	 * one node's use of it. Not a `VisibleTree` mutation since it isn't
	 * scoped to this view's rows. Omit to hide the delete affordance. */
	onDeleteTag?: (name: string) => void | Promise<void>;
	/** Handles clicking a tag pill on a tree row, e.g. to activate a filter. */
	onTagClick?: (tag: string) => void;
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
	/** All of this user's statuses, for the status picker. */
	existingStatuses: StatusSummary[];
	/** Excluded by an active filter; rendered collapsed and out of the tab order. */
	isHidden: boolean;
	/** Direct completion is in its opacity-only exit phase. */
	isCompletionExiting: boolean;
	/** Not itself a filter match, but an ancestor of one; rendered dimmed. */
	isContext: boolean;
	/** Whether expanding this row would reveal at least one visible child;
	 * false suppresses the expand chevron even when `row.hasChildren`. */
	hasVisibleChildren: boolean;
	/** Newly mounted descendant in the current expansion's virtualizer slice. */
	revealOnMount: boolean;
	editing: boolean;
	focusPoint: FocusPoint | null;
	onStartEdit: (point?: FocusPoint) => void;
	onExitEdit: () => void;
	onToggle: (expanded: boolean) => void;
	onConvert: (type: NodeTypeName) => undefined | Promise<boolean>;
	onTurnInto: (blockType: BlockType) => undefined | Promise<boolean>;
	onToggleTask: (completed: boolean) => void;
	onSetDueDate: (date: Date | null, time: CalendarTimeString | null) => void;
	onSetRecurrence: (recurrence: RecurrenceInput | null) => void;
	onSetTags: (tags: string[]) => void;
	onSetPriority: (priority: PriorityName | null) => void;
	onSetStatus: (statusId: string | null) => void;
	onSetBoardView: (isBoard: boolean) => void;
	onSetIcon: (icon: string | null) => void;
	onTagClick?: (tag: string) => void;
	onDeleteTag?: (name: string) => void | Promise<void>;
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
	onMoveDrop: (draggedId: string, target: MoveTarget) => Promise<boolean>;
}
