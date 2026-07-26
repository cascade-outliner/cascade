import { $createLinkNode } from "@lexical/link";
import {
	$createTextNode,
	$getRoot,
	$getSelection,
	$isRangeSelection,
	COMMAND_PRIORITY_HIGH,
	KEY_ARROW_DOWN_COMMAND,
	KEY_ARROW_UP_COMMAND,
	KEY_BACKSPACE_COMMAND,
	KEY_ENTER_COMMAND,
	KEY_SPACE_COMMAND,
	KEY_TAB_COMMAND,
	type LexicalEditor,
	PASTE_COMMAND,
} from "lexical";
import { type RefObject, useEffect, useRef } from "react";
import { isHttpUrl, tidyUrlLabel } from "../content/link-url";

interface EditorCommandHandlers {
	onCreateBelow?: () => void;
	onDeleteEmpty?: () => void;
	onIndent?: () => void;
	onOutdent?: () => void;
	onFocusNext?: () => void;
	onFocusPrevious?: () => void;
	onCommitShorthand?: () => boolean;
	onCommitPastedShorthand?: () => boolean;
}

export function useEditorCommands(
	editor: LexicalEditor,
	handlers: EditorCommandHandlers,
	saveRef: RefObject<() => void>,
) {
	const handlersRef = useRef(handlers);
	handlersRef.current = handlers;

	useEffect(
		() =>
			editor.registerCommand(
				KEY_TAB_COMMAND,
				(event) => {
					const handler = event.shiftKey
						? handlersRef.current.onOutdent
						: handlersRef.current.onIndent;
					if (!handler) return false;

					event.preventDefault();
					handler();
					return true;
				},
				COMMAND_PRIORITY_HIGH,
			),
		[editor],
	);

	useEffect(
		() =>
			editor.registerCommand(
				KEY_SPACE_COMMAND,
				(event) => {
					if (
						event?.isComposing ||
						!handlersRef.current.onCommitShorthand?.()
					) {
						return false;
					}
					event?.preventDefault();
					return true;
				},
				COMMAND_PRIORITY_HIGH,
			),
		[editor],
	);

	useEffect(
		() =>
			editor.registerCommand(
				PASTE_COMMAND,
				(event) => {
					if (!(event instanceof ClipboardEvent)) return false;
					const rawPasted = event.clipboardData?.getData("text/plain") ?? "";
					const pasted = rawPasted.trim();

					const selection = $getSelection();
					if (!$isRangeSelection(selection)) return false;

					if (isHttpUrl(pasted)) {
						event.preventDefault();
						const link = $createLinkNode(pasted);
						link.append($createTextNode(tidyUrlLabel(pasted)));
						selection.insertNodes([link]);
						return true;
					}
					if (!/(^|\s)[#!]/u.test(rawPasted)) return false;
					event.preventDefault();
					selection.insertRawText(rawPasted);
					queueMicrotask(() => handlersRef.current.onCommitPastedShorthand?.());
					return true;
				},
				COMMAND_PRIORITY_HIGH,
			),
		[editor],
	);

	useEffect(
		() =>
			editor.registerCommand(
				KEY_ENTER_COMMAND,
				(event) => {
					if (event?.shiftKey) return false;
					if (!event?.isComposing) {
						handlersRef.current.onCommitShorthand?.();
					}
					event?.preventDefault();
					saveRef.current();
					handlersRef.current.onCreateBelow?.();
					return true;
				},
				COMMAND_PRIORITY_HIGH,
			),
		[editor, saveRef],
	);

	useEffect(
		() =>
			editor.registerCommand(
				KEY_BACKSPACE_COMMAND,
				(event) => {
					if (!handlersRef.current.onDeleteEmpty) return false;
					if ($getRoot().getTextContent() !== "") return false;

					event?.preventDefault();
					handlersRef.current.onDeleteEmpty();
					return true;
				},
				COMMAND_PRIORITY_HIGH,
			),
		[editor],
	);

	useEffect(
		() =>
			editor.registerCommand(
				KEY_ARROW_DOWN_COMMAND,
				(event) => {
					if (!event?.shiftKey || !handlersRef.current.onFocusNext) {
						return false;
					}

					event.preventDefault();
					saveRef.current();
					handlersRef.current.onFocusNext();
					return true;
				},
				COMMAND_PRIORITY_HIGH,
			),
		[editor, saveRef],
	);

	useEffect(
		() =>
			editor.registerCommand(
				KEY_ARROW_UP_COMMAND,
				(event) => {
					if (!event?.shiftKey || !handlersRef.current.onFocusPrevious) {
						return false;
					}

					event.preventDefault();
					saveRef.current();
					handlersRef.current.onFocusPrevious();
					return true;
				},
				COMMAND_PRIORITY_HIGH,
			),
		[editor, saveRef],
	);
}
