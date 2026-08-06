import {
	STATUS_COLORS,
	type StatusColor,
} from "@cascade/outliner/node-statuses";
import { useId } from "react";
import { m } from "#/paraglide/messages.js";
import { colorSwatch } from "./status-settings.styles";

/** The fixed status palette as a radio group of swatches — statuses only ever
 * take one of these six colors, so there's no free-form color picker. */
export function StatusColorPicker({
	value,
	onChange,
}: {
	value: StatusColor;
	onChange: (color: StatusColor) => void;
}) {
	// Own radio-group name per picker, so the create form's swatches and an
	// editing row's swatches don't end up in one group.
	const groupName = useId();

	return (
		<fieldset className="flex items-center gap-2">
			<legend className="sr-only">{m.settings_statuses_color_label()}</legend>
			{STATUS_COLORS.map((color) => (
				<label key={color} className="cursor-pointer">
					<input
						type="radio"
						name={groupName}
						value={color}
						checked={value === color}
						aria-label={m.settings_statuses_color_option({ color })}
						className="sr-only peer"
						onChange={() => onChange(color)}
					/>
					<span
						aria-hidden="true"
						className={colorSwatch({
							hue: color,
							selected: value === color,
							className: "block peer-focus-visible:ring-2 ring-danger/50",
						})}
					/>
				</label>
			))}
		</fieldset>
	);
}
