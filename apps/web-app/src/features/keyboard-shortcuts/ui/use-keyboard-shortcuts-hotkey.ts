import { useHotkey } from "@tanstack/react-hotkeys";

/**
 * Global `?` shortcut that opens the keyboard shortcuts reference. Left at
 * its library default `ignoreInputs: true` so typing a literal "?" inside a
 * node or a text field isn't hijacked.
 */
export function useKeyboardShortcutsHotkey(onOpen: () => void) {
	useHotkey({ key: "?", shift: true }, () => onOpen());
}
