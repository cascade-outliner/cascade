import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
	LexicalTypeaheadMenuPlugin,
	MenuOption,
	useBasicTypeaheadTriggerMatch,
} from "@lexical/react/LexicalTypeaheadMenuPlugin";
import { COMMAND_PRIORITY_HIGH, type TextNode } from "lexical";
import { useCallback, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { filterSlashMenuItems, type SlashMenuItem } from "./filter.ts";
import { SlashMenu } from "./slash-menu.tsx";

export type { SlashMenuGroup, SlashMenuItem } from "./filter.ts";
export { filterSlashMenuItems, groupSlashMenuItems } from "./filter.ts";

/** Wraps an item so Lexical can track it (by `key`) and scroll it into view (by ref). */
class SlashMenuOption<T extends SlashMenuItem> extends MenuOption {
	constructor(readonly item: T) {
		super(item.id);
	}
}

export interface SlashMenuPluginProps<T extends SlashMenuItem> {
	/** Everything the menu can offer; it filters by what's typed after the trigger. */
	items: readonly T[];
	/**
	 * Called once the trigger and query are gone from the editor and that edit
	 * has been committed, so listeners (and the store) already see the clean text.
	 */
	onSelect: (item: T) => void;
	/** The character that opens the menu, at the start of a line or after a space. */
	trigger?: string;
}

/**
 * A Lexical plugin: typing the trigger opens a menu of `items` at the caret,
 * narrowed by the text typed after it. Arrows move, Enter/Tab pick, Escape
 * dismisses; the menu hides while nothing matches. Render it inside a composer.
 */
export function SlashMenuPlugin<T extends SlashMenuItem>({
	items,
	onSelect,
	trigger = "/",
}: SlashMenuPluginProps<T>) {
	const [editor] = useLexicalComposerContext();
	const [query, setQuery] = useState<string | null>(null);
	const triggerFn = useBasicTypeaheadTriggerMatch(trigger, { minLength: 0 });

	const options = useMemo(
		() =>
			filterSlashMenuItems(items, query ?? "").map(
				(item) => new SlashMenuOption(item),
			),
		[items, query],
	);

	const onSelectOption = useCallback(
		(
			option: SlashMenuOption<T>,
			queryNode: TextNode | null,
			closeMenu: () => void,
		) => {
			queryNode?.remove();
			closeMenu();
			editor.update(() => {}, {
				onUpdate: () => onSelect(option.item),
			});
		},
		[editor, onSelect],
	);

	return (
		<LexicalTypeaheadMenuPlugin<SlashMenuOption<T>>
			options={options}
			onQueryChange={setQuery}
			onSelectOption={onSelectOption}
			triggerFn={triggerFn}
			commandPriority={COMMAND_PRIORITY_HIGH}
			menuRenderFn={(
				anchorRef,
				{ selectedIndex, selectOptionAndCleanUp, setHighlightedIndex },
			) =>
				anchorRef.current && options.length > 0
					? createPortal(
							<SlashMenu
								items={options.map((option) => option.item)}
								highlightedIndex={selectedIndex}
								onHighlight={setHighlightedIndex}
								onSelect={(item) => {
									const option = options.find((each) => each.item === item);
									if (option) selectOptionAndCleanUp(option);
								}}
								itemRef={(item, element) =>
									options
										.find((each) => each.item === item)
										?.setRefElement(element)
								}
							/>,
							anchorRef.current,
						)
					: null
			}
		/>
	);
}
