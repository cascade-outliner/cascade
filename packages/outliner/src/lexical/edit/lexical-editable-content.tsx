import { $createLinkNode } from "@lexical/link";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import {
	$createRangeSelection,
	$createTextNode,
	$getNearestNodeFromDOMNode,
	$getRoot,
	$getSelection,
	$isRangeSelection,
	$isTextNode,
	$setSelection,
	COMMAND_PRIORITY_HIGH,
	KEY_ARROW_DOWN_COMMAND,
	KEY_ARROW_UP_COMMAND,
	KEY_BACKSPACE_COMMAND,
	KEY_ENTER_COMMAND,
	KEY_TAB_COMMAND,
	PASTE_COMMAND,
} from "lexical";
import { useEffect, useRef } from "react";
import type { FocusPoint } from "../../node-editor";
import { isHttpUrl, tidyUrlLabel } from "../link-url";
import type { LexicalElementNode } from "../read/lexical-read-view";

interface EditableContentProps {
	focusPoint: FocusPoint | null;
	onSave: (content: { root: LexicalElementNode }) => void;
	onExit?: () => void;
	onCreateBelow?: () => void;
	onDeleteEmpty?: () => void;
	onIndent?: () => void;
	onOutdent?: () => void;
	onFocusNext?: () => void;
	onFocusPrevious?: () => void;
}

/** Cross-browser caret lookup for a screen point (Firefox lacks caretRangeFromPoint). */
function caretRangeFromPoint(x: number, y: number): Range | null {
	if (document.caretRangeFromPoint) return document.caretRangeFromPoint(x, y);
	const position = document.caretPositionFromPoint?.(x, y);
	if (!position) return null;
	const range = document.createRange();
	range.setStart(position.offsetNode, position.offset);
	range.collapse(true);
	return range;
}

export function EditableContent({
	focusPoint,
	onSave,
	onExit,
	onCreateBelow,
	onDeleteEmpty,
	onIndent,
	onOutdent,
	onFocusNext,
	onFocusPrevious,
}: EditableContentProps) {
	const [editor] = useLexicalComposerContext();
	const lastSavedRef = useRef<string | null>(null);

	const save = () => {
		const state = editor.getEditorState().toJSON();
		const serialized = JSON.stringify(state);
		if (serialized === lastSavedRef.current) return;
		lastSavedRef.current = serialized;
		onSave({ root: state.root as unknown as LexicalElementNode });
	};

	const saveRef = useRef(save);
	saveRef.current = save;

	const onCreateBelowRef = useRef(onCreateBelow);
	onCreateBelowRef.current = onCreateBelow;

	const onDeleteEmptyRef = useRef(onDeleteEmpty);
	onDeleteEmptyRef.current = onDeleteEmpty;

	const onIndentRef = useRef(onIndent);
	onIndentRef.current = onIndent;

	const onOutdentRef = useRef(onOutdent);
	onOutdentRef.current = onOutdent;

	const onFocusNextRef = useRef(onFocusNext);
	onFocusNextRef.current = onFocusNext;

	const onFocusPreviousRef = useRef(onFocusPrevious);
	onFocusPreviousRef.current = onFocusPrevious;

	useEffect(() => {
		return editor.registerCommand(
			KEY_TAB_COMMAND,
			(event) => {
				const handler = event.shiftKey
					? onOutdentRef.current
					: onIndentRef.current;
				if (!handler) return false;
				event.preventDefault();
				handler();
				return true;
			},
			COMMAND_PRIORITY_HIGH,
		);
	}, [editor]);

	useEffect(() => {
		return editor.registerCommand(
			PASTE_COMMAND,
			(event) => {
				if (!(event instanceof ClipboardEvent)) return false;
				const pasted = event.clipboardData?.getData("text/plain").trim() ?? "";
				if (!isHttpUrl(pasted)) return false;
				const selection = $getSelection();
				if (!$isRangeSelection(selection)) return false;
				event.preventDefault();
				const link = $createLinkNode(pasted);
				link.append($createTextNode(tidyUrlLabel(pasted)));
				selection.insertNodes([link]);
				return true;
			},
			COMMAND_PRIORITY_HIGH,
		);
	}, [editor]);

	useEffect(() => {
		return editor.registerCommand(
			KEY_ENTER_COMMAND,
			(event) => {
				if (event?.shiftKey) return false;
				event?.preventDefault();
				saveRef.current();
				onCreateBelowRef.current?.();
				return true;
			},
			COMMAND_PRIORITY_HIGH,
		);
	}, [editor]);

	useEffect(() => {
		return editor.registerCommand(
			KEY_BACKSPACE_COMMAND,
			(event) => {
				if (!onDeleteEmptyRef.current) return false;
				if ($getRoot().getTextContent() !== "") return false;
				event?.preventDefault();
				onDeleteEmptyRef.current();
				return true;
			},
			COMMAND_PRIORITY_HIGH,
		);
	}, [editor]);

	useEffect(() => {
		return editor.registerCommand(
			KEY_ARROW_DOWN_COMMAND,
			(event) => {
				if (!event?.shiftKey || !onFocusNextRef.current) return false;
				event.preventDefault();
				saveRef.current();
				onFocusNextRef.current();
				return true;
			},
			COMMAND_PRIORITY_HIGH,
		);
	}, [editor]);

	useEffect(() => {
		return editor.registerCommand(
			KEY_ARROW_UP_COMMAND,
			(event) => {
				if (!event?.shiftKey || !onFocusPreviousRef.current) return false;
				event.preventDefault();
				saveRef.current();
				onFocusPreviousRef.current();
				return true;
			},
			COMMAND_PRIORITY_HIGH,
		);
	}, [editor]);

	useEffect(() => {
		lastSavedRef.current = JSON.stringify(editor.getEditorState().toJSON());

		const rootElement = editor.getRootElement();
		const range =
			rootElement && focusPoint
				? caretRangeFromPoint(focusPoint.x, focusPoint.y)
				: null;
		if (rootElement && range && rootElement.contains(range.startContainer)) {
			// Place the caret through Lexical's own selection model, not a raw
			// DOM range: plugins that register node transforms on mount (e.g.
			// AutoLinkPlugin) schedule an update whose reconciliation discards
			// any DOM selection Lexical doesn't own, which reset the caret to
			// the start of the node.
			editor.update(() => {
				const node = $getNearestNodeFromDOMNode(range.startContainer);
				if ($isTextNode(node)) {
					const selection = $createRangeSelection();
					selection.anchor.set(node.getKey(), range.startOffset, "text");
					selection.focus.set(node.getKey(), range.startOffset, "text");
					$setSelection(selection);
				} else {
					$getRoot().selectEnd();
				}
			});
			rootElement.focus({ preventScroll: true });
		} else if (rootElement) {
			editor.update(() => {
				$getRoot().selectEnd();
			});
			rootElement.focus({ preventScroll: true });
		}

		return () => saveRef.current();
	}, [editor, focusPoint]);

	return (
		<RichTextPlugin
			contentEditable={
				<ContentEditable
					className="flex-1 outline-none w-full rr-block"
					onBlur={() => {
						save();
						onExit?.();
					}}
				/>
			}
			ErrorBoundary={LexicalErrorBoundary}
		/>
	);
}
