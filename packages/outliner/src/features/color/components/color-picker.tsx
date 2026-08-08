import { CheckIcon, ProhibitIcon } from "@phosphor-icons/react/ssr";
import {
	NODE_COLOR_BORDER,
	NODE_COLOR_NAMES,
	type NodeColorName,
} from "../../../nodes/model/node-color";
// Same checklist visuals as the tag editor and priority editor.
import {
	checkbox,
	optionButton,
	optionRow,
} from "../../tags/components/node-tags-editor/node-tags-editor.styles";
import { useOutlinerLabels } from "../../../i18n/outliner-labels-context";

/** Fixed color palette picker, shared by the context-menu submenu. */
export function ColorPicker({
	color,
	onChange,
}: {
	color: NodeColorName | null;
	onChange: (color: NodeColorName | null) => void;
}) {
	const labels = useOutlinerLabels();

	return (
		<div className="w-44">
			{NODE_COLOR_NAMES.map((name) => {
				const checked = color === name;
				return (
					<div key={name} className={optionRow()}>
						<button
							type="button"
							className={optionButton()}
							aria-pressed={checked}
							onClick={() => onChange(checked ? null : name)}
						>
							<span className={checkbox({ checked })}>
								{checked && <CheckIcon size={10} weight="bold" />}
							</span>
							<span
								className={`inline-block h-3 w-3 shrink-0 rounded-sm border-2 ${NODE_COLOR_BORDER[name]}`}
							/>
							<span className="truncate capitalize">{labels.colorLabels[name]}</span>
						</button>
					</div>
				);
			})}
			<div className={optionRow()}>
				<button
					type="button"
					className={optionButton()}
					disabled={color === null}
					onClick={() => onChange(null)}
				>
					<span className="flex size-4 shrink-0 items-center justify-center">
						<ProhibitIcon size={12} weight="bold" />
					</span>
					<span className="truncate">{labels.colorNone}</span>
				</button>
			</div>
		</div>
	);
}
