import * as stylex from "@stylexjs/stylex";

export const colors = stylex.defineVars({
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
	primaryMuted: "rgba(173, 76, 78, 0.08)",
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

export const radius = stylex.defineVars({
	xs: "5px",
	sm: "7px",
	md: "9px",
	lg: "10px",
	xl: "13px",
	xxl: "14px",
});

export const space = stylex.defineVars({
	"1": "1px",
	"2": "2px",
	"4": "4px",
	"5": "5px",
	"6": "6px",
	"7": "7px",
	"8": "8px",
	"9": "9px",
	"10": "10px",
	"11": "11px",
	"12": "12px",
	"14": "14px",
	"16": "16px",
	"20": "20px",
	"22": "22px",
	"32": "32px",
});

export const shadow = stylex.defineVars({
	float: "0 10px 30px -8px rgba(0, 0, 0, 0.25)",
	popup: "0 18px 40px -12px rgba(43, 45, 51, 0.3)",
	focus:
		"0 0 0 1px rgba(173, 76, 78, 0.3), 0 3px 10px -3px rgba(0, 0, 0, 0.12)",
});

export const zIndex = stylex.defineVars({
	toolbar: "50",
	overlay: "100",
	popup: "101",
});

export const duration = stylex.defineVars({
	instant: "0.05s",
	fast: "150ms",
});

export const opacity = stylex.defineVars({
	disabled: "0.4",
});

export const borderWidth = stylex.defineVars({
	thin: "1px",
	thick: "1.5px",
});
