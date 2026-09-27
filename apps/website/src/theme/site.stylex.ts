import * as stylex from "@stylexjs/stylex";

// The marketing site is light-only, so these don't follow the device theme the
// way @cascade/theme's colors do.
export const site = stylex.defineVars({
	canvas: "#fcf5ee",
	card: "#fffaf5",
	tint: "#f5ece3",
	ink: "#2b2d33",
	inkSoft: "#3c3e45",
	muted: "#62646b",
	faint: "#9a9087",
	primary: "#ad4c4e",
	primaryHover: "#8e3c3e",
	primaryTint: "rgba(173, 76, 78, 0.07)",
	primaryTintStrong: "rgba(173, 76, 78, 0.1)",
	onDark: "#fcf5ee",
	onDarkMuted: "#b6a99c",
	onDarkSoft: "#d9cfc5",
	accentOnDark: "#e58a86",
	hairline: "rgba(43, 45, 51, 0.07)",
	rule: "rgba(43, 45, 51, 0.12)",
	success: "rgba(120, 150, 90, 0.18)",
});

export const siteFontSize = stylex.defineVars({
	eyebrow: "0.75rem",
	small: "0.906rem",
	body: "1rem",
	lead: "1.0625rem",
	large: "1.25rem",
	h3: "1.25rem",
	h2: "clamp(2rem, 1.2rem + 2.6vw, 2.875rem)",
	h1: "clamp(2.5rem, 1.4rem + 4vw, 4.75rem)",
	display: "clamp(2.75rem, 1.6rem + 4vw, 4.25rem)",
	price: "3.25rem",
});

export const siteShadow = stylex.defineVars({
	card: "inset 0 0 0 1px rgba(43, 45, 51, 0.07)",
	cardStrong: "inset 0 0 0 1px rgba(43, 45, 51, 0.08)",
	lift: "0 20px 50px -24px rgba(43, 45, 51, 0.3)",
	pop: "0 8px 20px -8px rgba(43, 45, 51, 0.3)",
	outline:
		"0 1px 2px rgba(43, 45, 51, 0.06), 0 24px 60px -24px rgba(43, 45, 51, 0.35), inset 0 0 0 1px rgba(43, 45, 51, 0.07)",
	focus: "0 0 0 3px rgba(173, 76, 78, 0.4)",
});

export const siteLayout = stylex.defineVars({
	maxWidth: "1280px",
	gutter: "clamp(1.25rem, 4vw, 3.5rem)",
	sectionGap: "clamp(4rem, 8vw, 6.25rem)",
});
