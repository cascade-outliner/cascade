import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import {
	$getRoot,
	COMMAND_PRIORITY_HIGH,
	KEY_BACKSPACE_COMMAND,
	KEY_ENTER_COMMAND,
	KEY_TAB_COMMAND,
} from "lexical";
import { useEffect, useRef } from "react";
import type { FocusPoint } from "../../node-editor";
import type { LexicalElementNode } from "../read/lexical-read-view";

interface EditableContentProps {
	focusPoint: FocusPoint | null;
	onSave: (content: { root: LexicalElementNode }) => void;
	onExit?: () => void;
	onCreateBelow?: () => void;
	onDeleteEmpty?: () => void;
	onIndent?: () => void;
	onOutdent?: () => void;
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
		lastSavedRef.current = JSON.stringify(editor.getEditorState().toJSON());

		const rootElement = editor.getRootElement();
		const range =
			rootElement && focusPoint
				? caretRangeFromPoint(focusPoint.x, focusPoint.y)
				: null;
		if (rootElement && range && rootElement.contains(range.startContainer)) {
			const selection = window.getSelection();
			selection?.removeAllRanges();
			selection?.addRange(range);
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
