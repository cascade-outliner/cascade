import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { useRef } from "react";
import type { FocusPoint } from "../../model/focus-point";
import type { ShorthandConfig } from "../../shorthand/shorthand-parser";
import {
	type ShorthandApplication,
	useShorthand,
} from "../../shorthand/use-shorthand";
import type { LexicalElementNode } from "../model/lexical-node.types";
import { useEditorCommands } from "./use-editor-commands";
import { useEditorFocus } from "./use-editor-focus";
import { useEditorSave } from "./use-editor-save";

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
	shorthand?: ShorthandConfig;
	onApplyShorthand?: (
		application: ShorthandApplication,
	) => Promise<void> | void;
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
	shorthand,
	onApplyShorthand,
}: EditableContentProps) {
	const [editor] = useLexicalComposerContext();
	const { lastSavedRef, save, saveRef } = useEditorSave(editor, onSave);
	const { commitAtCursor, commitNew, saveAfterPending } = useShorthand(
		editor,
		shorthand,
		onApplyShorthand,
		(content) => {
			lastSavedRef.current = JSON.stringify(content);
		},
	);
	const deferredSaveRef = useRef(save);
	deferredSaveRef.current = () => saveAfterPending(saveRef.current);

	useEditorCommands(
		editor,
		{
			onCreateBelow,
			onDeleteEmpty,
			onIndent,
			onOutdent,
			onFocusNext,
			onFocusPrevious,
			onCommitShorthand: commitAtCursor,
			onCommitPastedShorthand: commitNew,
		},
		deferredSaveRef,
	);
	useEditorFocus(editor, focusPoint, lastSavedRef, deferredSaveRef);

	return (
		<RichTextPlugin
			contentEditable={
				<ContentEditable
					className="flex-1 outline-none w-full rr-block"
					onBlur={() => {
						if (!editor.isComposing()) commitNew();
						deferredSaveRef.current();
						onExit?.();
					}}
				/>
			}
			ErrorBoundary={LexicalErrorBoundary}
		/>
	);
}
