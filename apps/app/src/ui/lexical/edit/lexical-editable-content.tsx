import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { COMMAND_PRIORITY_HIGH, KEY_ENTER_COMMAND } from "lexical";
import { useEffect, useRef } from "react";
import type { LexicalElementNode } from "@/ui/lexical/read/lexical-read-view";
import type { FocusPoint } from "@/ui/nodes/node-editor";

interface EditableContentProps {
	focusPoint: FocusPoint | null;
	onSave: (content: { root: LexicalElementNode }) => void;
	onExit?: () => void;
	onCreateBelow?: () => void;
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
		} else {
			editor.focus();
		}

		return () => saveRef.current();
	}, [editor, focusPoint]);

	return (
		<RichTextPlugin
			contentEditable={
				<ContentEditable
					className="flex-1 outline-none w-full"
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
