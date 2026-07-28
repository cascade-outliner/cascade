import type { CalendarDateString } from "@cascade/outliner/calendar-date";
import type {
	NodeMetadata,
	NodeTypeName,
	TypedMetadata,
	VisibleNodeRow,
} from "@cascade/outliner/node-types";
import type {
	RecurrenceInput,
	RecurrenceRule,
} from "@cascade/outliner/recurrence";
import type { MoveTarget } from "@cascade/outliner/visible-rows";
import type { VisibleTreeData } from "../tree-data.types";
import type {
	ChangeId,
	ChangeOutcome,
	CreatePlacement,
	DeletionReceipt,
	InvalidationEffects,
	TreeCommand,
} from "./types";

/** The row shape the server returns from `create`/`duplicate`, before it's spliced into a positioned `VisibleNodeRow`. */
export interface CreatedNode {
	id: string;
	parentId: string | null;
	content: unknown;
	type: NodeTypeName;
	metadata: NodeMetadata;
	expanded: boolean;
	order: string;
	dueDate: CalendarDateString | null;
	recurrence: RecurrenceRule | null;
	tags: string[];
	hasChildren: boolean;
}

/**
 * Semantic remote operations the change module depends on. Accepts
 * placement (`before`/`after`/append), never a fractional sibling order —
 * the production adapter owns oRPC input/output translation.
 */
export interface TreeRemote {
	toggleExpanded(id: string, expanded: boolean): Promise<void>;
	fetchSubtree(
		id: string,
		options?: { includeCollapsedDescendants?: boolean },
	): Promise<VisibleNodeRow[]>;
	move(id: string, target: MoveTarget): Promise<void>;
	remove(id: string): Promise<{ childrenDeleted: number }>;
	restore(receipt: DeletionReceipt): Promise<void>;
	create(
		placement: CreatePlacement,
		options?: {
			initialType?: TypedMetadata;
			dueDate?: string | null;
			tags?: string[];
		},
	): Promise<CreatedNode>;
	duplicate(id: string): Promise<CreatedNode>;
	updateContent(id: string, content: { root: unknown } | null): Promise<void>;
	setType(id: string, typed: TypedMetadata): Promise<void>;
	setDueDate(id: string, dueDate: string | null): Promise<void>;
	setRecurrence(id: string, recurrence: RecurrenceInput | null): Promise<void>;
	setTags(id: string, tags: string[]): Promise<void>;
	setTaskCompleted(
		id: string,
		completed: boolean,
		expectedDueDate: string | null,
	): Promise<{ advanced: boolean; nextDueDate: string | null }>;
	/** Refetches the currently loaded window (page one through `pageCount`), authoritative for structural reconciliation. */
	fetchWindow(pageCount: number): Promise<VisibleTreeData>;
	/** Fetches exactly the next page after `cursor`, for `loadMore`. */
	fetchNextPage(cursor: string[]): Promise<VisibleTreeData>;
}

/** One optimistic entry replayed on top of `TreeViewStore`'s authoritative base. */
export interface PendingChange {
	id: ChangeId;
	command: TreeCommand;
	project: (rows: VisibleNodeRow[]) => VisibleNodeRow[];
}

/**
 * Owns one active view's operation journal: an authoritative `base` plus
 * pending optimistic projections replayed on top of it. `resolve`/`reject`
 * remove exactly one pending entry by identity; a whole snapshot is never
 * restored over newer work — later pending entries keep replaying.
 */
export interface TreeViewStore {
	cancelActiveReads(): Promise<void>;
	getBase(): VisibleTreeData;
	/** `base.rows` with every pending projection replayed on top, in command order. */
	getRows(): VisibleNodeRow[];
	addPending(entry: PendingChange): void;
	/** Folds a successful outcome into `base`, then drops the entry. */
	resolve(
		id: ChangeId,
		updateBase: (base: VisibleTreeData) => VisibleTreeData,
	): void;
	/** Drops a failed entry by identity; `refreshedBase`, if given, replaces authoritative state. */
	reject(id: ChangeId, refreshedBase?: VisibleTreeData): void;
	invalidate(effects: InvalidationEffects): void;
}

/**
 * Presentation-only row motion (entry/exit/reveal animation). Motion is
 * never semantic: the change module isolates every call behind a
 * catch, so a throwing adapter can't fail or block a command outcome.
 */
export interface TreeMotion {
	/** Runs before the optimistic projection is appended/published. */
	before(command: TreeCommand): Promise<void> | void;
	/** Runs after the command has fully resolved (success or failure). */
	after(command: TreeCommand, outcome: ChangeOutcome): Promise<void> | void;
}

export interface HistoryEntry {
	undo: () => void | Promise<void>;
	redo: () => void | Promise<void>;
}

/** Registers one undoable action's inverse; the module only calls this after semantic success in `"record"` mode. */
export interface TreeHistory {
	push(entry: HistoryEntry): void;
}
