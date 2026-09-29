import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
	LexicalTypeaheadMenuPlugin,
	MenuOption,
	useBasicTypeaheadTriggerMatch,
} from "@lexical/react/LexicalTypeaheadMenuPlugin";
import {
	$getSelection,
	$isRangeSelection,
	$isTextNode,
	COMMAND_PRIORITY_HIGH,
	type TextNode,
} from "lexical";
import { useCallback, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { filterSlashMenuItems, type SlashMenuItem } from "./filter.ts";
import { SlashMenu } from "./slash-menu.tsx";
import { matchSlashTrigger } from "./trigger.ts";

/**
 * Removes a trigger and query still sitting before the caret. Lexical hands
 * over the query's node from a match it resolves in a transition, so a pick
 * right after a keystroke can split one character short and leave "/" (or
 * more) behind. Call it after removing that node, inside the same update.
 */
function $removeTriggerBeforeCaret(trigger: string) {
	const selection = $getSelection();
	if (!$isRangeSelection(selection) || !selection.isCollapsed()) return;
	const { offset } = selection.anchor;
	const node = selection.anchor.getNode();
	if (!$isTextNode(node)) return;
	const text = node.getTextContent();
	const match = matchSlashTrigger(text.slice(0, offset), trigger);
	if (!match) return;
	node.setTextContent(text.slice(0, match.index) + text.slice(offset));
	node.select(match.index, match.index);
}

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
			$removeTriggerBeforeCaret(trigger);
			closeMenu();
			editor.update(() => {}, {
				onUpdate: () => onSelect(option.item),
			});
		},
		[editor, onSelect, trigger],
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
