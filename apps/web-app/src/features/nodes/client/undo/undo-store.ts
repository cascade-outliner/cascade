import { toast } from "@cascade/ui/toast";
import { m } from "#/paraglide/messages.js";

export interface UndoableAction {
	undo: () => void | Promise<void>;
	redo: () => void | Promise<void>;
}

const MAX_STACK_SIZE = 100;

// Module-level singleton (same pattern as @cascade/ui/toast's toastManager):
// undo/redo is a cross-cutting, session-scoped concern that every mutation
// hook needs to reach regardless of which tree view rendered it, and nothing
// here runs during SSR — only from mutation callbacks and the keydown
// handler, both client-only.
let undoStack: UndoableAction[] = [];
let redoStack: UndoableAction[] = [];

/** Registers an action's inverse; call this after a user-initiated mutation, not from inside undo/redo itself. */
function push(action: UndoableAction) {
	undoStack = [...undoStack, action].slice(-MAX_STACK_SIZE);
	redoStack = [];
}

function undo() {
	const action = undoStack.at(-1);
	if (!action) return;
	undoStack = undoStack.slice(0, -1);
	redoStack = [...redoStack, action];
	toast.info(m.undo_action_undone());
	action.undo();
}

function redo() {
	const action = redoStack.at(-1);
	if (!action) return;
	redoStack = redoStack.slice(0, -1);
	undoStack = [...undoStack, action];
	toast.info(m.undo_action_redone());
	action.redo();
}

/** Test-only: clears both stacks so specs don't leak state across cases. */
function reset() {
	undoStack = [];
	redoStack = [];
}

export const undoStore = { push, undo, redo, reset };
