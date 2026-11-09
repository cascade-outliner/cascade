import * as stylex from "@stylexjs/stylex";

const DARK_MEDIA = "@media (prefers-color-scheme: dark)";

// Palette from the "core" design system: snow, navy, plum, azure, coral.
// Light values are the "snow" surface; dark values are the "navy" surface and
// apply automatically when the device is in dark mode.
export const palette = stylex.defineVars({
	snow: "#f0f0f0",
	snowDeep: "#dcdcdc",
	plum: "#50216a",
	navy: "#192036",
	azure: "#0177bb",
	azureDeep: "#016aa8",
	coral: "#d65b5c",
	white: "#ffffff",
	gray300: "#e4e4e4",
});

export const colors = stylex.defineVars({
	white: { default: "#ffffff", [DARK_MEDIA]: "#232c48" },
	canvas: { default: "#f0f0f0", [DARK_MEDIA]: "#192036" },
	surface: { default: "#ffffff", [DARK_MEDIA]: "#222a44" },
	danger: { default: "#d65b5c", [DARK_MEDIA]: "#e8807f" },
	muted: { default: "#5b6072", [DARK_MEDIA]: "#a9adba" },
	accent: { default: "#d65b5c", [DARK_MEDIA]: "#d65b5c" },
	ink: { default: "#192036", [DARK_MEDIA]: "#f0f0f0" },
	primary: { default: "#192036", [DARK_MEDIA]: "#f0f0f0" },
	primaryHover: { default: "#50216a", [DARK_MEDIA]: "#d65b5c" },
	/** Text and icons on a `primary` background. */
	onPrimary: { default: "#f0f0f0", [DARK_MEDIA]: "#192036" },
	placeholder: { default: "#8c909c", [DARK_MEDIA]: "#6e748a" },
	border: {
		default: "rgba(25, 32, 54, 0.2)",
		[DARK_MEDIA]: "rgba(240, 240, 240, 0.2)",
	},
	borderStrong: {
		default: "#192036",
		[DARK_MEDIA]: "#f0f0f0",
	},
	overlay: {
		default: "rgba(25, 32, 54, 0.4)",
		[DARK_MEDIA]: "rgba(0, 0, 0, 0.55)",
	},
	inkSubtle: {
		default: "rgba(25, 32, 54, 0.08)",
		[DARK_MEDIA]: "rgba(240, 240, 240, 0.08)",
	},
	inkSubtleHover: {
		default: "rgba(25, 32, 54, 0.16)",
		[DARK_MEDIA]: "rgba(240, 240, 240, 0.16)",
	},
	/** Calm, informational accents: future due dates. */
	info: { default: "#0177bb", [DARK_MEDIA]: "#6cb8ea" },
	infoMuted: {
		default: "rgba(1, 119, 187, 0.1)",
		[DARK_MEDIA]: "rgba(108, 184, 234, 0.14)",
	},
	primaryMuted: {
		default: "rgba(25, 32, 54, 0.08)",
		[DARK_MEDIA]: "rgba(240, 240, 240, 0.12)",
	},
	/** Brand highlight: plum. */
	highlight: { default: "#50216a", [DARK_MEDIA]: "#c9a6dc" },
	focusRing: { default: "#0177bb", [DARK_MEDIA]: "#f0f0f0" },
});

export const fonts = stylex.defineVars({
	app: '"Onest Variable", "Onest", "Onest Fallback", system-ui, sans-serif',
	mono: '"IBM Plex Mono", ui-monospace, monospace',
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

// core radius scale: control 8, card 20.
export const radius = stylex.defineVars({
	sm: "8px",
	md: "12px",
	lg: "20px",
	xl: "24px",
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
	float: "0 10px 30px -8px rgba(25, 32, 54, 0.25)",
	popup: "0 18px 40px -12px rgba(25, 32, 54, 0.3)",
	focus:
		"0 0 0 1px rgba(1, 119, 187, 0.4), 0 3px 10px -3px rgba(25, 32, 54, 0.12)",
	focusRing: {
		default: "0 0 0 2px #0177bb",
		[DARK_MEDIA]: "0 0 0 2px #f0f0f0",
	},
});

export const zIndex = stylex.defineVars({
	overlay: "100",
	popup: "101",
});

const REDUCED_MOTION = "@media (prefers-reduced-motion: reduce)";

export const duration = stylex.defineVars({
	"50": { default: "50ms", [REDUCED_MOTION]: "0s" },
	"100": { default: "100ms", [REDUCED_MOTION]: "0s" },
	"150": { default: "150ms", [REDUCED_MOTION]: "0s" },
	"200": { default: "200ms", [REDUCED_MOTION]: "0s" },
	"300": { default: "300ms", [REDUCED_MOTION]: "0s" },
	"400": { default: "400ms", [REDUCED_MOTION]: "0s" },
	"600": { default: "600ms", [REDUCED_MOTION]: "0s" },
});

export const easing = stylex.defineVars({
	soft: "cubic-bezier(0.2, 0.7, 0.2, 1)",
	pop: "cubic-bezier(0.3, 1.4, 0.5, 1)",
	slow: "cubic-bezier(0.7, 0, 0.2, 1)",
	travel: "cubic-bezier(0.65, 0, 0.35, 1)",
	spring: "cubic-bezier(0.3, 1.9, 0.5, 1)",
	overshoot: "cubic-bezier(0.5, -0.4, 0.3, 1.4)",
	exit: "cubic-bezier(0.4, 0, 1, 1)",
});

export const opacity = stylex.defineVars({
	disabled: "0.4",
});

export const borderWidth = stylex.defineVars({
	thin: "1px",
	thick: "1.5px",
});

export const lineHeight = stylex.defineVars({
	tight: "1.14",
	snug: "1.25",
	normal: "1.4",
	compact: "1.8",
});
