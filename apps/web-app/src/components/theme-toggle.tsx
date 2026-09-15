import {
	borderWidth,
	colors,
	radius,
	shadow,
	space,
	zIndex,
} from "@cascade/theme/tokens.stylex";
import { DesktopIcon, MoonIcon, SunIcon } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import type { ThemeMode } from "#/lib/theme.tsx";
import { useTheme } from "#/lib/theme.tsx";

const MODES: readonly ThemeMode[] = ["system", "light", "dark"];

const LABELS: Record<ThemeMode, string> = {
	system: "Match system theme",
	light: "Light theme",
	dark: "Dark theme",
};

const styles = stylex.create({
	button: {
		position: "fixed",
		top: space["4"],
		right: space["4"],
		zIndex: zIndex.toolbar,
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		width: 36,
		height: 36,
		borderRadius: radius.full,
		borderWidth: borderWidth.thin,
		borderStyle: "solid",
		borderColor: colors.border,
		backgroundColor: colors.white,
		color: colors.ink,
		cursor: "default",
		boxShadow: shadow.float,
		":hover": {
			backgroundColor: colors.surface,
		},
	},
});

export function ThemeToggle() {
	const { mode, setMode } = useTheme();

	function cycle() {
		const index = MODES.indexOf(mode);
		setMode(MODES[(index + 1) % MODES.length]);
	}

	return (
		<button
			type="button"
			{...stylex.props(styles.button)}
			onClick={cycle}
			aria-label={`Theme: ${LABELS[mode]}. Click to switch theme.`}
			title={LABELS[mode]}
		>
			{mode === "system" && <DesktopIcon size={18} />}
			{mode === "light" && <SunIcon size={18} />}
			{mode === "dark" && <MoonIcon size={18} />}
		</button>
	);
}
