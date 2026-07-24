import type { RegisterableHotkey } from "@tanstack/react-hotkeys";
import { m } from "#/paraglide/messages.js";

export interface ShortcutEntry {
	/** Equivalent key combos that trigger the same action. */
	hotkeys: RegisterableHotkey[];
	description: () => string;
}

export interface ShortcutGroup {
	title: () => string;
	entries: ShortcutEntry[];
}

/** Read-only reference of the shortcuts implemented in `packages/outliner`
 * (tree navigation/editing, `use-editor-commands.ts`) and the app-level undo
 * shortcuts (`features/nodes/client/undo`) — see #437. Keep in sync with
 * those implementations rather than the other way around. */
export const keyboardShortcutGroups: ShortcutGroup[] = [
	{
		title: () => m.keyboard_shortcuts_group_general(),
		entries: [
			{
				hotkeys: [{ key: "?", shift: true }],
				description: () => m.keyboard_shortcuts_open_help(),
			},
			{ hotkeys: ["Mod+Z"], description: () => m.keyboard_shortcuts_undo() },
			{
				hotkeys: ["Mod+Shift+Z"],
				description: () => m.keyboard_shortcuts_redo(),
			},
		],
	},
	{
		title: () => m.keyboard_shortcuts_group_navigation(),
		entries: [
			{
				hotkeys: ["Enter", "Space"],
				description: () => m.keyboard_shortcuts_start_editing(),
			},
			{
				hotkeys: ["Shift+ArrowUp"],
				description: () => m.keyboard_shortcuts_focus_previous(),
			},
			{
				hotkeys: ["Shift+ArrowDown"],
				description: () => m.keyboard_shortcuts_focus_next(),
			},
		],
	},
	{
		title: () => m.keyboard_shortcuts_group_editing(),
		entries: [
			{
				hotkeys: ["Enter"],
				description: () => m.keyboard_shortcuts_save_create_below(),
			},
			{
				hotkeys: ["Shift+Enter"],
				description: () => m.keyboard_shortcuts_new_line(),
			},
			{
				hotkeys: ["Backspace"],
				description: () => m.keyboard_shortcuts_delete_empty(),
			},
			{ hotkeys: ["Tab"], description: () => m.keyboard_shortcuts_indent() },
			{
				hotkeys: ["Shift+Tab"],
				description: () => m.keyboard_shortcuts_outdent(),
			},
		],
	},
	{
		title: () => m.keyboard_shortcuts_group_reorder(),
		entries: [
			{
				hotkeys: ["Alt+Shift+ArrowUp"],
				description: () => m.keyboard_shortcuts_move_up(),
			},
			{
				hotkeys: ["Alt+Shift+ArrowDown"],
				description: () => m.keyboard_shortcuts_move_down(),
			},
		],
	},
];
