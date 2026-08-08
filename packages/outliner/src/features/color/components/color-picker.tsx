import { CheckIcon, ProhibitIcon } from "@phosphor-icons/react/ssr";
import { useOutlinerLabels } from "../../../i18n/outliner-labels-context";
import {
	isHexColor,
	isNodeColorName,
	NODE_COLOR_BORDER,
	NODE_COLOR_HEX,
	NODE_COLOR_NAMES,
} from "../../../nodes/model/node-color";
// Same checklist visuals as the tag editor and priority editor.
import {
	checkbox,
	optionButton,
	optionRow,
} from "../../tags/components/node-tags-editor/node-tags-editor.styles";

/**
 * Palette + custom-color picker. The upper section lists the fixed preset
 * swatches; the bottom row offers a native `<input type="color">` so users
 * can pick any hex color they like.
 */
export function ColorPicker({
	color,
	onChange,
}: {
	color: string | null;
	onChange: (color: string | null) => void;
}) {
	const labels = useOutlinerLabels();

	// Resolve the hex value to pre-fill the native picker.
	// If a palette name is active, use its canonical hex; if a custom hex is
	// active, use it directly; otherwise fall back to a neutral gray.
	const pickerValue = isNodeColorName(color)
		? NODE_COLOR_HEX[color]
		: isHexColor(color)
			? color
			: "#9ca3af";

	// A custom color is active when the stored value is a hex string (not a
	// palette name), so the "Custom" row shows as checked.
	const isCustomActive = isHexColor(color) && !isNodeColorName(color);

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
							<span className="truncate capitalize">
								{labels.colorLabels[name]}
							</span>
						</button>
					</div>
				);
			})}

			{/* Custom color via native picker */}
			<div className={optionRow()}>
				<label className={optionButton()}>
					<span className={checkbox({ checked: isCustomActive })}>
						{isCustomActive && <CheckIcon size={10} weight="bold" />}
					</span>
					<span
						className="inline-block h-3 w-3 shrink-0 rounded-sm border border-gray-300"
						style={{
							background: isCustomActive
								? (color ?? undefined)
								: "conic-gradient(red, yellow, lime, aqua, blue, magenta, red)",
						}}
					/>
					<span className="truncate">{labels.colorCustom}</span>
					{/* visually hidden but accessible native picker */}
					<input
						type="color"
						className="sr-only"
						value={pickerValue}
						onChange={(e) => onChange(e.target.value)}
					/>
				</label>
			</div>

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
