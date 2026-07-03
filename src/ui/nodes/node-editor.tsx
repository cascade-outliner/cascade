import { LexicalEditView } from "@/ui/lexical/edit/lexical-edit-view";
import { toLexicalContent } from "@/ui/lexical/lexical-content";
import type { LexicalElementNode } from "@/ui/lexical/read/lexical-read-view";
import { LexicalReadView } from "@/ui/lexical/read/lexical-read-view";

interface NodeEditorProps {
	id: string;
	content: unknown;
	editing: boolean;
	onStartEdit: () => void;
	onExit: () => void;
	onSave: (content: { root: LexicalElementNode }) => void;
}

export function NodeEditor({
	id,
	content,
	editing,
	onStartEdit,
	onExit,
	onSave,
}: NodeEditorProps) {
	if (editing) {
		return (
			<LexicalEditView
				id={id}
				content={toLexicalContent(content)}
				onSave={onSave}
				onExit={onExit}
			/>
		);
	}

	return (
		// biome-ignore lint/a11y/useSemanticElements: the read view renders block elements (<p>), which are invalid inside <button>; keyboard/focus semantics are provided explicitly
		<div
			role="button"
			tabIndex={0}
			aria-label="Edit node text"
			className="cursor-text text-left"
			onClick={onStartEdit}
			onKeyDown={(event) => {
				if (event.key === "Enter" || event.key === " ") {
					event.preventDefault();
					onStartEdit();
				}
			}}
		>
			<LexicalReadView content={toLexicalContent(content)} />
		</div>
	);
}
