import { KeyboardCommandLabel } from "@cascade/ui/keyboard-command-label";
import {
	formatForDisplay,
	type RegisterableHotkey,
} from "@tanstack/react-hotkeys";
import { Fragment } from "react";
import { m } from "#/paraglide/messages.js";

export function KeyboardShortcutKeys({
	hotkeys,
}: {
	hotkeys: RegisterableHotkey[];
}) {
	const labels = hotkeys.map((hotkey) => formatForDisplay(hotkey));
	return (
		<span className="flex flex-wrap items-center gap-1.5">
			{labels.map((label, index) => (
				<Fragment key={label}>
					{index > 0 && (
						<span className="text-ink/50 text-xs dark:text-surface/50">
							{m.keyboard_shortcuts_or()}
						</span>
					)}
					<KeyboardCommandLabel>{label}</KeyboardCommandLabel>
				</Fragment>
			))}
		</span>
	);
}
