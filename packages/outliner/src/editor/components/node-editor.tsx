import { useOutlinerLabels } from "../../i18n/outliner-labels-context";
import { toLexicalContent } from "../lexical/content/lexical-content";
import {
	removeLinkFromContent,
	updateLinkInContent,
} from "../lexical/content/link-content";
import { LexicalEditView } from "../lexical/edit/lexical-edit-view";
import type { LexicalElementNode } from "../lexical/model/lexical-node.types";
import { LexicalReadView } from "../lexical/read/lexical-read-view";
import type { FocusPoint } from "../model/focus-point";
import type { ShorthandConfig } from "../shorthand/shorthand-parser";
import type { ShorthandApplication } from "../shorthand/use-shorthand";

export type { FocusPoint } from "../model/focus-point";

interface NodeEditorProps {
	id: string;
	content: unknown;
	editing: boolean;
	completed?: boolean;
	focusPoint: FocusPoint | null;
	onStartEdit: (point?: FocusPoint) => void;
	onExit: () => void;
	onSave: (content: { root: LexicalElementNode }) => void;
	onCreateBelow?: () => void;
	onDeleteEmpty?: () => void;
	onIndent?: () => void;
	onOutdent?: () => void;
	onMoveUp?: () => void;
	onMoveDown?: () => void;
	onFocusNext?: () => void;
	onFocusPrevious?: () => void;
	shorthand?: ShorthandConfig;
	onApplyShorthand?: (
		application: ShorthandApplication,
	) => Promise<void> | void;
}

export function NodeEditor({
	id,
	content,
	editing,
	completed,
	focusPoint,
	onStartEdit,
	onExit,
	onSave,
	onCreateBelow,
	onDeleteEmpty,
	onIndent,
	onOutdent,
	onMoveUp,
	onMoveDown,
	onFocusNext,
	onFocusPrevious,
	shorthand,
	onApplyShorthand,
}: NodeEditorProps) {
	const labels = useOutlinerLabels();
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
				shorthand={shorthand}
				onApplyShorthand={onApplyShorthand}
			/>
		);
	}

	return (
		// biome-ignore lint/a11y/useSemanticElements: the read view renders block elements (<p>), which are invalid inside <button>; keyboard/focus semantics are provided explicitly
		<div
			role="button"
			tabIndex={0}
			aria-label={labels.editNodeText}
			data-node-focus-target
			className={`cursor-text text-left flex-1 min-w-0 rr-block ${completed ? "line-through text-muted dark:text-canvas/30" : ""}`}
			onClick={(event) => onStartEdit({ x: event.clientX, y: event.clientY })}
			onKeyDown={(event) => {
				if (event.key === "Enter" || event.key === " ") {
					event.preventDefault();
					onStartEdit();
					return;
				}
				// Keyboard equivalent of dragging a row past its sibling — the
				// pointer-only reorder path in row-drag-drop.tsx.
				if (event.altKey && event.shiftKey) {
					if (event.key === "ArrowDown") {
						event.preventDefault();
						onMoveDown?.();
					} else if (event.key === "ArrowUp") {
						event.preventDefault();
						onMoveUp?.();
					}
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
			<LexicalReadView
				content={toLexicalContent(content)}
				onSaveLink={(path, update) => {
					const current = toLexicalContent(content);
					if (!current) return;
					const updated = updateLinkInContent(current, path, update);
					if (updated) onSave(updated);
				}}
				onDeleteLink={(path, update) => {
					const current = toLexicalContent(content);
					if (!current) return;
					const updated = removeLinkFromContent(current, path, update.text);
					if (updated) onSave(updated);
				}}
			/>
		</div>
	);
}
