import { CheckIcon } from "@phosphor-icons/react/ssr";
import { useOutlinerLabels } from "../../../i18n/outliner-labels-context";
import {
	type StatusSummary,
	toStatusColor,
} from "../../../nodes/model/node-statuses";
// Same checklist visuals as the tag editor, so every "pick from a list"
// popover in a row looks identical rather than growing parallel styles.
import {
	checkbox,
	optionButton,
	optionRow,
} from "../../tags/components/node-tags-editor/node-tags-editor.styles";
import { statusDot } from "./status-pill.styles";

export interface StatusEditorProps {
	/** The node's current status, or `null` in filter mode. */
	statusId: string | null;
	/** In filter mode, every selected status id (a node has at most one). */
	selectedIds?: string[];
	existingStatuses: StatusSummary[];
	onSelect: (statusId: string | null) => void;
	mode?: "edit" | "filter";
}

/**
 * The user's statuses as a single-select list. Statuses are created, renamed,
 * recolored and deleted in Settings → Statuses, so this picker only ever
 * selects one (or clears it). Filter mode lets several be selected at once.
 */
export function StatusEditor({
	statusId,
	selectedIds,
	existingStatuses,
	onSelect,
	mode = "edit",
}: StatusEditorProps) {
	const labels = useOutlinerLabels();
	const filterMode = mode === "filter";
	const selected = new Set(selectedIds ?? (statusId ? [statusId] : []));

	return (
		<div className={filterMode ? "px-1 pb-1" : "w-56"}>
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
						</div>
					);
				})}
			</div>
		</div>
	);
}
