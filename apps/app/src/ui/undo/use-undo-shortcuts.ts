import { useHotkey } from "@tanstack/react-hotkeys";
import { undoStore } from "./undo-store";

const TEXT_INPUT_TAGS = new Set(["INPUT", "TEXTAREA"]);

/** Skipped inside plain `<input>`/`<textarea>` fields (e.g. the due-date/tag editors) so their native undo keeps working. */
function isTextInput(event: KeyboardEvent) {
	const target = event.target as HTMLElement | null;
	return !!target && TEXT_INPUT_TAGS.has(target.tagName);
}

/**
 * Global Cmd/Ctrl+Z (undo) and Shift+Cmd/Ctrl+Z (redo), via TanStack Hotkeys'
 * cross-platform `Mod` modifier. `ignoreInputs` bundles contentEditable in
 * with `<input>`/`<textarea>`/`<select>`, but we want the opposite split —
 * fire inside the Lexical node editor's contentEditable (it has no history
 * plugin of its own and relies on this for undo) while leaving plain
 * `<input>`/`<textarea>` fields (e.g. the due-date/tag editors) to their
 * native undo — so `ignoreInputs` is disabled and `isTextInput` does that
 * split itself, including only calling `preventDefault` when we act.
 */
export function useUndoShortcuts() {
	useHotkey(
		"Mod+Z",
		(event) => {
			if (isTextInput(event)) return;
			event.preventDefault();
			undoStore.undo();
		},
		{ ignoreInputs: false, preventDefault: false },
	);

	useHotkey(
		"Mod+Shift+Z",
		(event) => {
			if (isTextInput(event)) return;
			event.preventDefault();
			undoStore.redo();
		},
		{ ignoreInputs: false, preventDefault: false },
	);
}
