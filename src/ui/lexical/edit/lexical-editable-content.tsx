import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { useEffect, useRef } from "react";
import type { LexicalElementNode } from "@/ui/lexical/read/lexical-read-view";

interface EditableContentProps {
	onSave: (content: { root: LexicalElementNode }) => void;
	onExit?: () => void;
}

export function EditableContent({ onSave, onExit }: EditableContentProps) {
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

	useEffect(() => {
		lastSavedRef.current = JSON.stringify(editor.getEditorState().toJSON());
		return () => saveRef.current();
	}, [editor]);

	return (
		<RichTextPlugin
			contentEditable={
				<ContentEditable
					onBlur={() => {
						save();
						onExit?.();
					}}
				/>
			}
			placeholder={null}
			ErrorBoundary={LexicalErrorBoundary}
		/>
	);
}
