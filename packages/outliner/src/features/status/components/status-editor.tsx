import { CheckIcon, PlusIcon, TrashIcon } from "@phosphor-icons/react/ssr";
import { useState } from "react";
import { useOutlinerLabels } from "../../../i18n/outliner-labels-context";
import {
	MAX_STATUS_LENGTH,
	type StatusSummary,
	toStatusColor,
} from "../../../nodes/model/node-statuses";
// Same checklist visuals as the tag editor, so every "pick from a list"
// popover in a row looks identical rather than growing parallel styles.
import {
	charCount,
	checkbox,
	deleteTagButton,
	input,
	limitError,
	optionButton,
	optionRow,
	search,
} from "../../tags/components/node-tags-editor/node-tags-editor.styles";
import { statusDot } from "./status-pill.styles";

export interface StatusEditorProps {
	/** The node's current status, or `null` in filter mode. */
	statusId: string | null;
	/** In filter mode, every selected status id (a node has at most one). */
	selectedIds?: string[];
	existingStatuses: StatusSummary[];
	onSelect: (statusId: string | null) => void;
	/** Creates a status and returns it, so the editor can select it right
	 * away. Omit (as filter mode does) to hide the create affordance. */
	onCreateStatus?: (name: string) => Promise<StatusSummary | null>;
	/** Deletes a status outright; nodes in it simply lose it. Omit to hide. */
	onDeleteStatus?: (id: string) => void | Promise<void>;
	mode?: "edit" | "filter";
}

/**
 * The user's statuses as a single-select list, with inline creation so the
 * picker is never dead-empty for a user who has none yet. Filter mode drops
 * creation/deletion and lets several statuses be selected at once.
 */
export function StatusEditor({
	statusId,
	selectedIds,
	existingStatuses,
	onSelect,
	onCreateStatus,
	onDeleteStatus,
	mode = "edit",
}: StatusEditorProps) {
	const labels = useOutlinerLabels();
	const filterMode = mode === "filter";
	const [name, setName] = useState("");
	const [creating, setCreating] = useState(false);
	const trimmed = name.trim();
	const overLimit = trimmed.length > MAX_STATUS_LENGTH;
	const selected = new Set(selectedIds ?? (statusId ? [statusId] : []));

	const create = async () => {
		if (!onCreateStatus || !trimmed || overLimit || creating) return;
		setCreating(true);
		try {
			const created = await onCreateStatus(trimmed);
			setName("");
			if (created) onSelect(created.id);
		} finally {
			setCreating(false);
		}
	};

	return (
		<div className={filterMode ? "px-1 pb-1" : "w-56"}>
			{!filterMode && onCreateStatus && (
				<>
					<div className={search({ compact: true })}>
						<input
							value={name}
							placeholder={labels.statusInputPlaceholder}
							className={input()}
							aria-invalid={overLimit || undefined}
							onClick={(e) => e.stopPropagation()}
							onChange={(e) => setName(e.target.value)}
							onKeyDown={(e) => {
								if (e.key !== "Enter") return;
								e.preventDefault();
								void create();
							}}
						/>
						{trimmed.length > 0 && (
							<span className={charCount({ over: overLimit })}>
								{trimmed.length}/{MAX_STATUS_LENGTH}
							</span>
						)}
					</div>
					{overLimit && (
						<p role="alert" className={limitError()}>
							{labels.statusNameTooLong}
						</p>
					)}
					{trimmed.length > 0 && !overLimit && (
						<button
							type="button"
							className={optionRow()}
							disabled={creating}
							onClick={() => void create()}
						>
							<span className="flex min-w-0 flex-1 items-center gap-2 py-1.5 pl-1">
								<PlusIcon size={12} weight="bold" className="shrink-0" />
								<span className="truncate">
									{labels.createStatus} &ldquo;{trimmed}&rdquo;
								</span>
							</span>
						</button>
					)}
				</>
			)}
			<div className="max-h-48 overflow-y-auto">
				{existingStatuses.length === 0 && (
					<p className="px-1 py-1.5 text-sm text-muted dark:text-surface/60">
						{labels.statusEmpty}
					</p>
				)}
				{existingStatuses.map((status) => {
					const checked = selected.has(status.id);
					return (
						<div key={status.id} className={optionRow()}>
							<button
								type="button"
								className={optionButton()}
								aria-pressed={checked}
								// Edit mode is single-select, so re-picking the current
								// status clears it. Filter mode is multi-select, so it
								// always reports the id and lets the caller toggle.
								onClick={() =>
									onSelect(!filterMode && checked ? null : status.id)
								}
							>
								<span className={checkbox({ checked })}>
									{checked && <CheckIcon size={10} weight="bold" />}
								</span>
								<span
									className={statusDot({ hue: toStatusColor(status.color) })}
								/>
								<span className="truncate">{status.name}</span>
							</button>
							{!filterMode && onDeleteStatus && (
								<button
									type="button"
									className={deleteTagButton()}
									aria-label={`${labels.deleteStatusAria}: ${status.name}`}
									onClick={(e) => {
										e.stopPropagation();
										void onDeleteStatus(status.id);
									}}
								>
									<TrashIcon size={12} weight="bold" />
								</button>
							)}
						</div>
					);
				})}
			</div>
		</div>
	);
}
