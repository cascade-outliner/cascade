import { type KeyboardEvent, useEffect, useState } from "react";
import { filterSlashMenuItems, type SlashMenuItem } from "./filter.ts";
import { matchSlashTrigger } from "./trigger.ts";

export interface InputSlashMenuOptions<T extends SlashMenuItem> {
	/** The input's current value. */
	value: string;
	/** Everything the menu can offer; it filters by what's typed after the trigger. */
	items: readonly T[];
	/**
	 * Called with the picked item and the value without the trigger and query,
	 * trimmed. The caller decides what to do with the text.
	 */
	onSelect: (item: T, text: string) => void;
	/** The character that opens the menu, at the start or after a space. */
	trigger?: string;
}

export interface InputSlashMenu<T extends SlashMenuItem> {
	/** Whether to show the menu: a trigger with text before it, and something matching. */
	open: boolean;
	/** The matching items, for `SlashMenu`. */
	items: T[];
	highlightedIndex: number;
	highlight: (index: number) => void;
	select: (item: T) => void;
	/** Give the input's keys to the menu first; `true` means it took the key. */
	onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => boolean;
}

/**
 * The slash menu for a plain `<input>`, the counterpart of `SlashMenuPlugin`
 * for Lexical. Commands act on the text before the trigger, so the menu
 * stays closed while there is none. Escape hides it until the value changes.
 */
export function useInputSlashMenu<T extends SlashMenuItem>({
	value,
	items,
	onSelect,
	trigger = "/",
}: InputSlashMenuOptions<T>): InputSlashMenu<T> {
	const [highlightedIndex, highlight] = useState(0);
	const [dismissed, setDismissed] = useState<string | null>(null);

	const match = matchSlashTrigger(value, trigger);
	const text = match ? value.slice(0, match.index).trim() : "";
	const matching =
		match && text ? filterSlashMenuItems(items, match.query) : [];
	const open = matching.length > 0 && dismissed !== value;
	const query = match?.query ?? null;

	// biome-ignore lint/correctness/useExhaustiveDependencies: the highlight starts over with each new query
	useEffect(() => highlight(0), [query]);

	const select = (item: T) => {
		setDismissed(value);
		onSelect(item, text);
	};

	const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
		if (!open) return false;
		const last = matching.length - 1;
		switch (event.key) {
			case "ArrowDown":
				highlight((index) => (index >= last ? 0 : index + 1));
				break;
			case "ArrowUp":
				highlight((index) => (index <= 0 ? last : index - 1));
				break;
			case "Enter":
			case "Tab": {
				const item = matching[Math.min(highlightedIndex, last)];
				if (item) select(item);
				break;
			}
			case "Escape":
				setDismissed(value);
				break;
			default:
				return false;
		}
		event.preventDefault();
		return true;
	};

	return {
		open,
		items: matching,
		highlightedIndex: Math.min(
			highlightedIndex,
			Math.max(matching.length - 1, 0),
		),
		highlight,
		select,
		onKeyDown,
	};
}
