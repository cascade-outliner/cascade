import * as stylex from "@stylexjs/stylex";

const DARK_MEDIA = "@media (prefers-color-scheme: dark)";

// Light values are the defaults; dark values apply automatically when the OS
// is in dark mode. `lightTheme`/`darkTheme` below force one or the other,
// for the manual override toggle.
export const colors = stylex.defineVars({
	white: { default: "#ffffff", [DARK_MEDIA]: "#2a2420" },
	canvas: { default: "#fcf5ee", [DARK_MEDIA]: "#1c1815" },
	surface: { default: "#f9e4d6", [DARK_MEDIA]: "#342b25" },
	danger: { default: "#ad4c4e", [DARK_MEDIA]: "#e2897e" },
	muted: { default: "#62646b", [DARK_MEDIA]: "#a9a29b" },
	accent: { default: "#e38b75", [DARK_MEDIA]: "#eab08f" },
	ink: { default: "#2b2d33", [DARK_MEDIA]: "#f3ece4" },
	primary: { default: "#ad4c4e", [DARK_MEDIA]: "#e2897e" },
	placeholder: { default: "#a8a7ad", [DARK_MEDIA]: "#756e67" },
	border: {
		default: "rgba(43, 45, 51, 0.08)",
		[DARK_MEDIA]: "rgba(243, 236, 228, 0.1)",
	},
	borderStrong: {
		default: "rgba(43, 45, 51, 0.22)",
		[DARK_MEDIA]: "rgba(243, 236, 228, 0.24)",
	},
	overlay: {
		default: "rgba(43, 45, 51, 0.32)",
		[DARK_MEDIA]: "rgba(0, 0, 0, 0.5)",
	},
	inkSubtle: {
		default: "rgba(43, 45, 51, 0.1)",
		[DARK_MEDIA]: "rgba(243, 236, 228, 0.08)",
	},
	inkSubtleHover: {
		default: "rgba(43, 45, 51, 0.18)",
		[DARK_MEDIA]: "rgba(243, 236, 228, 0.16)",
	},
	primaryMuted: {
		default: "rgba(173, 76, 78, 0.08)",
		[DARK_MEDIA]: "rgba(226, 137, 126, 0.16)",
	},
});

// Forces light colors regardless of OS preference. Apply via
// `stylex.props(lightTheme)` on the root element for a manual "light" choice.
export const lightTheme = stylex.createTheme(colors, {
	white: "#ffffff",
	canvas: "#fcf5ee",
	surface: "#f9e4d6",
	danger: "#ad4c4e",
	muted: "#62646b",
	accent: "#e38b75",
	ink: "#2b2d33",
	primary: "#ad4c4e",
	placeholder: "#a8a7ad",
	border: "rgba(43, 45, 51, 0.08)",
	borderStrong: "rgba(43, 45, 51, 0.22)",
	overlay: "rgba(43, 45, 51, 0.32)",
	inkSubtle: "rgba(43, 45, 51, 0.1)",
	inkSubtleHover: "rgba(43, 45, 51, 0.18)",
	primaryMuted: "rgba(173, 76, 78, 0.08)",
});

// Forces dark colors regardless of OS preference. Apply via
// `stylex.props(darkTheme)` on the root element for a manual "dark" choice.
export const darkTheme = stylex.createTheme(colors, {
	white: "#2a2420",
	canvas: "#1c1815",
	surface: "#342b25",
	danger: "#e2897e",
	muted: "#a9a29b",
	accent: "#eab08f",
	ink: "#f3ece4",
	primary: "#e2897e",
	placeholder: "#756e67",
	border: "rgba(243, 236, 228, 0.1)",
	borderStrong: "rgba(243, 236, 228, 0.24)",
	overlay: "rgba(0, 0, 0, 0.5)",
	inkSubtle: "rgba(243, 236, 228, 0.08)",
	inkSubtleHover: "rgba(243, 236, 228, 0.16)",
	primaryMuted: "rgba(226, 137, 126, 0.16)",
});

export const fonts = stylex.defineVars({
	app: '"Bitter Variable", serif',
});

export const fontSize = stylex.defineVars({
	"100": "0.65rem",
	"200": "0.7rem",
	"300": "0.85rem",
	"400": "0.875rem",
	"500": "0.9rem",
	"600": "1rem",
	"700": "1.05rem",
	"800": "1.7rem",
});

// 4px base unit, same scale as `space` below.
export const radius = stylex.defineVars({
	sm: "4px",
	md: "8px",
	lg: "12px",
	xl: "16px",
	full: "999px",
});

// Tailwind-style spacing scale: each step is a multiple of a 4px (0.25rem) base unit.
export const space = stylex.defineVars({
	px: "1px",
	"0.5": "2px",
	"1": "4px",
	"1.5": "6px",
	"2": "8px",
	"2.5": "10px",
	"3": "12px",
	"3.5": "14px",
	"4": "16px",
	"5": "20px",
	"6": "24px",
	"8": "32px",
});

export const shadow = stylex.defineVars({
	float: "0 10px 30px -8px rgba(0, 0, 0, 0.25)",
	popup: "0 18px 40px -12px rgba(43, 45, 51, 0.3)",
	focus:
		"0 0 0 1px rgba(173, 76, 78, 0.3), 0 3px 10px -3px rgba(0, 0, 0, 0.12)",
	focusRing: "0 0 0 2px rgba(173, 76, 78, 0.35)",
});

export const zIndex = stylex.defineVars({
	toolbar: "50",
	overlay: "100",
	popup: "101",
});

// Milliseconds.
export const duration = stylex.defineVars({
	"50": "50ms",
	"100": "100ms",
	"150": "150ms",
});

export const opacity = stylex.defineVars({
	disabled: "0.4",
});

export const borderWidth = stylex.defineVars({
	thin: "1px",
	thick: "1.5px",
});

export const lineHeight = stylex.defineVars({
	compact: "1.8",
});
