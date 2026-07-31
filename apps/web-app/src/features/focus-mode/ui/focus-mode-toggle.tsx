import { TargetIcon } from "@phosphor-icons/react/ssr";
import { useHotkey } from "@tanstack/react-hotkeys";
import { m } from "#/paraglide/messages.js";
import { useFocusMode } from "../client/focus-mode-context";

export function FocusModeToggle() {
	const { focusMode, toggleFocusMode } = useFocusMode();

	useHotkey(
		"Mod+Shift+F",
		(event) => {
			event.preventDefault();
			toggleFocusMode();
		},
		{ ignoreInputs: false, preventDefault: false },
	);

	const label = focusMode
		? m.focus_mode_toggle_disable()
		: m.focus_mode_toggle_enable();

	return (
		<button
			type="button"
			onClick={toggleFocusMode}
			aria-pressed={focusMode}
			aria-label={label}
			title={label}
			className={`flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border outline-none focus-visible:ring-2 focus-visible:ring-danger/50 ${
				focusMode
					? "border-transparent bg-ink text-canvas dark:bg-surface dark:text-ink"
					: "border-ink/10 bg-white/70 text-ink/70 hover:bg-white hover:text-ink dark:border-surface/15 dark:bg-ink/70 dark:text-surface/70 dark:hover:bg-ink dark:hover:text-surface"
			}`}
		>
			<TargetIcon size={16} weight="bold" />
		</button>
	);
}
