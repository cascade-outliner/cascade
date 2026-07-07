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
	onFocusNext?: () => void;
	onFocusPrevious?: () => void;
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
	onFocusNext,
	onFocusPrevious,
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
				onFocusNext={onFocusNext}
				onFocusPrevious={onFocusPrevious}
			/>
		);
	}

	return (
		// biome-ignore lint/a11y/useSemanticElements: the read view renders block elements (<p>), which are invalid inside <button>; keyboard/focus semantics are provided explicitly
		<div
			role="button"
			tabIndex={0}
			aria-label="Edit node text"
			data-node-focus-target
			className="cursor-text text-left flex-1 min-w-0"
			onClick={(event) => onStartEdit({ x: event.clientX, y: event.clientY })}
			onKeyDown={(event) => {
				if (event.key === "Enter" || event.key === " ") {
					event.preventDefault();
					onStartEdit();
					return;
				}
				if (!event.shiftKey) return;
				if (event.key === "ArrowDown") {
					event.preventDefault();
					onFocusNext?.();
				} else if (event.key === "ArrowUp") {
					event.preventDefault();
					onFocusPrevious?.();
				}
			}}
		>
			<LexicalReadView content={toLexicalContent(content)} />
		</div>
	);
}
