import { CheckIcon, FlagIcon, ProhibitIcon } from "@phosphor-icons/react/ssr";
import { useOutlinerLabels } from "../../../i18n/outliner-labels-context";
import {
	PRIORITY_NAMES,
	type PriorityName,
} from "../../../nodes/model/node-priority";
// Same checklist visuals as the tag editor, so every "pick from a list"
// popover in a row looks identical rather than growing parallel styles.
import {
	checkbox,
	optionButton,
	optionRow,
} from "../../tags/components/node-tags-editor/node-tags-editor.styles";

/** The four fixed levels plus a "no priority" clear, shared by the row's
 * trailing pill popover and the context-menu submenu. */
export function PriorityEditor({
	priority,
	onChange,
}: {
	priority: PriorityName | null;
	onChange: (priority: PriorityName | null) => void;
}) {
	const labels = useOutlinerLabels();

	return (
		<div className="w-44">
			{PRIORITY_NAMES.map((level) => {
				const checked = priority === level;
				return (
					<div key={level} className={optionRow()}>
						<button
							type="button"
							className={optionButton()}
							aria-pressed={checked}
							onClick={() => onChange(checked ? null : level)}
						>
							<span className={checkbox({ checked })}>
								{checked && <CheckIcon size={10} weight="bold" />}
							</span>
							<FlagIcon size={12} weight="bold" className="shrink-0" />
							<span className="truncate">{labels.priorityLabels[level]}</span>
						</button>
					</div>
				);
			})}
			<div className={optionRow()}>
				<button
					type="button"
					className={optionButton()}
					disabled={priority === null}
					onClick={() => onChange(null)}
				>
					<span className="flex size-4 shrink-0 items-center justify-center">
						<ProhibitIcon size={12} weight="bold" />
					</span>
					<span className="truncate">{labels.priorityNone}</span>
				</button>
			</div>
		</div>
	);
}
