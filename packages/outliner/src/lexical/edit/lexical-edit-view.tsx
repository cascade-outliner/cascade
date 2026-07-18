import { LinkNode } from "@lexical/link";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import type { FocusPoint } from "../../node-editor";
import type { LexicalElementNode } from "../read/lexical-read-view";
import { EditableContent } from "./lexical-editable-content";

export interface LexicalEditViewProps {
	id: string;
	content: { root: LexicalElementNode } | null;
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

export function LexicalEditView({
	id,
	content,
	focusPoint,
	onSave,
	onExit,
	onCreateBelow,
	onDeleteEmpty,
	onIndent,
	onOutdent,
	onFocusNext,
	onFocusPrevious,
}: LexicalEditViewProps) {
	return (
		<LexicalComposer
			initialConfig={{
				namespace: `node-editor-${id}`,
				nodes: [LinkNode],
				theme: {
					link: "text-redleather underline decoration-redleather/40 underline-offset-2 dark:text-peach dark:decoration-peach/40",
				},
				onError: (error) => console.error("lexical error", error),
				editorState: content ? JSON.stringify(content) : null,
			}}
		>
			<EditableContent
				focusPoint={focusPoint}
				onSave={onSave}
				onExit={onExit}
				onCreateBelow={onCreateBelow}
				onDeleteEmpty={onDeleteEmpty}
				onIndent={onIndent}
				onOutdent={onOutdent}
				onFocusNext={onFocusNext}
				onFocusPrevious={onFocusPrevious}
			/>
		</LexicalComposer>
	);
}
