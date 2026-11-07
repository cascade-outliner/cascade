import * as stylex from "@stylexjs/stylex";

// The marketing site is light-only (the core "snow" surface), so these don't
// follow the device theme the way @cascade/theme's colors do.
export const site = stylex.defineVars({
	canvas: "#f0f0f0",
	card: "#ffffff",
	tint: "#e4e4e4",
	ink: "#192036",
	inkSoft: "#2e3550",
	muted: "#5b6072",
	faint: "#8c909c",
	primary: "#192036",
	primaryHover: "#50216a",
	primaryTint: "rgba(25, 32, 54, 0.07)",
	primaryTintStrong: "rgba(25, 32, 54, 0.12)",
	accent: "#d65b5c",
	info: "#0177bb",
	highlight: "#50216a",
	onDark: "#f0f0f0",
	onDarkMuted: "#a9adba",
	onDarkSoft: "#d0d3dc",
	accentOnDark: "#d65b5c",
	hairline: "rgba(25, 32, 54, 0.08)",
	rule: "rgba(25, 32, 54, 0.2)",
	success: "rgba(1, 119, 187, 0.14)",
	focusRing: "#0177bb",
});

// The site's own face; the app itself still uses fonts.app from @cascade/theme.
export const siteFont = stylex.defineVars({
	sans: '"Onest Variable", "Onest", "Onest Fallback", system-ui, sans-serif',
});

// Utopia fluid scale: 18px at 360px wide (x1.2) to 20px at 1440px (x1.25).
export const siteFontSize = stylex.defineVars({
	eyebrow: "0.75rem",
	small: "clamp(0.9375rem, 0.9167rem + 0.0926vw, 1rem)",
	body: "clamp(1.125rem, 1.0833rem + 0.1852vw, 1.25rem)",
	lead: "clamp(1.35rem, 1.2792rem + 0.3148vw, 1.5625rem)",
	large: "clamp(1.62rem, 1.509rem + 0.4935vw, 1.9531rem)",
	h3: "clamp(1.35rem, 1.2792rem + 0.3148vw, 1.5625rem)",
	h2: "clamp(1.944rem, 1.7782rem + 0.7369vw, 2.4414rem)",
	h1: "clamp(2.7994rem, 2.4609rem + 1.5042vw, 3.8147rem)",
	display: "clamp(3.3592rem, 2.8895rem + 2.0876vw, 4.7684rem)",
	price: "clamp(2.3328rem, 2.0931rem + 1.0651vw, 3.0518rem)",
});

export const siteShadow = stylex.defineVars({
	card: "inset 0 0 0 1px rgba(25, 32, 54, 0.08)",
	cardStrong: "inset 0 0 0 1px rgba(25, 32, 54, 0.12)",
	lift: "0 20px 50px -24px rgba(25, 32, 54, 0.3)",
	pop: "0 8px 20px -8px rgba(25, 32, 54, 0.3)",
	outline:
		"0 1px 2px rgba(25, 32, 54, 0.06), 0 24px 60px -24px rgba(25, 32, 54, 0.35), inset 0 0 0 1px rgba(25, 32, 54, 0.08)",
	focus: "0 0 0 2px #f0f0f0, 0 0 0 4px #0177bb",
});

export const siteLayout = stylex.defineVars({
	maxWidth: "1400px",
	gutter: "clamp(1.125rem, 1.0833rem + 0.1852vw, 1.25rem)",
	sectionGap: "clamp(4.5rem, 2.6667rem + 8.1481vw, 10rem)",
});
