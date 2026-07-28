import type {
	TypedMetadata,
	VisibleNodeRow,
} from "@cascade/outliner/node-types";
import type { RecurrenceInput } from "@cascade/outliner/recurrence";
import type { AddNodeOptions } from "@cascade/outliner/tree-types";
import type { MoveTarget } from "@cascade/outliner/visible-rows";

export type ChangeId = string;

/**
 * `"record"` (the default) pushes a new history entry on semantic success.
 * `"undo"`/`"redo"` re-enter `execute` from a history closure and must not
 * push again — the original `"record"` push already owns both directions.
 * `"none"` runs a command that was never meant to be undoable (e.g. a
 * structural repair the module issues internally).
 */
export type HistoryMode = "record" | "undo" | "redo" | "none";

export interface ChangeContext {
	history?: HistoryMode;
}

/** Where a freshly created node is placed; mirrors `VisibleTree.add`/`addAfter`. */
export type CreatePlacement =
	| { parentId: string | null; position: "append" }
	| { parentId: string | null; position: "after"; afterId: string };

/**
 * Captured snapshot of a deleted subtree, replayed by `restore`. This shape
 * is provisional: #535 owns the final deletion-lifecycle persistence format
 * (it may become an opaque server reference instead of a client-built
 * receipt), and this command's payload will follow whatever it decides.
 */
export interface DeletionReceipt {
	row: VisibleNodeRow;
	descendants: VisibleNodeRow[];
	target: MoveTarget;
}

export type TreeCommand =
	| { kind: "toggle"; id: string; expanded: boolean }
	| { kind: "move"; id: string; target: MoveTarget; expandParentId?: string }
	| { kind: "remove"; id: string }
	| { kind: "restore"; deletion: DeletionReceipt }
	| { kind: "create"; placement: CreatePlacement; options?: AddNodeOptions }
	| { kind: "duplicate"; id: string }
	| { kind: "updateContent"; id: string; content: { root: unknown } | null }
	| { kind: "setType"; id: string; typed: TypedMetadata }
	| { kind: "setDueDate"; id: string; dueDate: string | null }
	| { kind: "setRecurrence"; id: string; recurrence: RecurrenceInput | null }
	| { kind: "setTags"; id: string; tags: string[] }
	| {
			kind: "setTaskCompleted";
			id: string;
			completed: boolean;
			expectedDueDate: string | null;
	  }
	| { kind: "loadMore" };

export type TreeCommandKind = TreeCommand["kind"];

export type ChangeErrorKind = "validation" | "remote";

export interface ChangeError {
	kind: ChangeErrorKind;
	message: string;
	cause?: unknown;
}

export interface ChangeOutcome {
	id: ChangeId;
	command: TreeCommand;
	status: "succeeded" | "failed";
	error?: ChangeError;
}

/**
 * The commands a history entry replays: `undo` reverses the original
 * command, `redo` repeats whatever recreates its effect. These are not
 * always simple inverses of one another — e.g. `create`'s undo is a
 * `remove`, but its redo is a `restore` of the captured receipt rather than
 * a second `create`, so both directions land on the same row identity.
 */
export interface InvertedCommands {
	undo: TreeCommand;
	redo: TreeCommand;
}

/** Query-family effects a successful command declares; applied by `TreeViewStore.invalidate`. */
export interface InvalidationEffects {
	/** Every `visibleTree` query variant (filters can change membership). */
	family?: boolean;
	/** The existing-tags suggestion list. */
	existingTags?: boolean;
	/** Ancestor-chain queries that include this node id. */
	ancestorsOf?: string;
}
