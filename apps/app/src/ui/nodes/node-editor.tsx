import { LexicalEditView } from "@/ui/lexical/edit/lexical-edit-view";
import { toLexicalContent } from "@/ui/lexical/lexical-content";
import type { LexicalElementNode } from "@/ui/lexical/read/lexical-read-view";
import { LexicalReadView } from "@/ui/lexical/read/lexical-read-view";

export interface FocusPoint {
	x: number;
	y: number;
}

interface NodeEditorProps {
	id: string;
	content: unknown;
	editing: boolean;
	focusPoint: FocusPoint | null;
	onStartEdit: (point?: FocusPoint) => void;
	onExit: () => void;
	onSave: (content: { root: LexicalElementNode }) => void;
	onCreateBelow?: () => void;
	onDeleteEmpty?: () => void;
	onIndent?: () => void;
	onOutdent?: () => void;
}

export function NodeEditor({
	id,
	content,
	editing,
	focusPoint,
	onStartEdit,
	onExit,
	onSave,
	onCreateBelow,
	onDeleteEmpty,
	onIndent,
	onOutdent,
}: NodeEditorProps) {
	if (editing) {
		return (
			<LexicalEditView
				id={id}
				content={toLexicalContent(content)}
				focusPoint={focusPoint}
				onSave={onSave}
				onExit={onExit}
				onCreateBelow={onCreateBelow}
				onDeleteEmpty={onDeleteEmpty}
				onIndent={onIndent}
				onOutdent={onOutdent}
			/>
		);
	}

	return (
		// biome-ignore lint/a11y/useSemanticElements: the read view renders block elements (<p>), which are invalid inside <button>; keyboard/focus semantics are provided explicitly
		<div
			role="button"
			tabIndex={0}
			aria-label="Edit node text"
			className="cursor-text text-left flex-1 min-w-0"
			onClick={(event) => onStartEdit({ x: event.clientX, y: event.clientY })}
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
