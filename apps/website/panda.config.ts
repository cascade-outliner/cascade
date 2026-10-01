import { defineConfig } from "@pandacss/dev";

const token = <T extends string | number>(value: T) => ({ value });

export default defineConfig({
	designSystem: "@cascade/theme",
	include: ["./src/**/*.{ts,tsx}"],
	exclude: ["./src/styled-system/**", "./src/app/_payload/**"],
	outdir: "src/styled-system",
	importMap: "@/styled-system",
	jsxFramework: "react",
	strictTokens: true,
	// Panda emits conditions in this order, so a property that needs three
	// values (desktop / tablet / phone) pairs `_tabletOnly` with `_mobile`
	// instead of `_tablet`.
	conditions: {
		tablet: "@media (max-width: 900px)",
		tabletOnly: "@media (min-width: 641px) and (max-width: 900px)",
		mobile: "@media (max-width: 640px)",
	},
	globalCss: {
		html: {
			scrollBehavior: "smooth",
			_motionReduce: { scrollBehavior: "auto" },
		},
	},
	theme: {
		extend: {
			tokens: {
				// The marketing site is light-only, so these don't follow the device
				// theme the way @cascade/theme's colors do.
				colors: {
					site: {
						canvas: token("#fcf5ee"),
						card: token("#fffaf5"),
						tint: token("#f5ece3"),
						ink: token("#2b2d33"),
						inkSoft: token("#3c3e45"),
						muted: token("#62646b"),
						faint: token("#9a9087"),
						primary: token("#ad4c4e"),
						primaryHover: token("#8e3c3e"),
						primaryTint: token("rgba(173, 76, 78, 0.07)"),
						primaryTintStrong: token("rgba(173, 76, 78, 0.1)"),
						onDark: token("#fcf5ee"),
						onDarkMuted: token("#b6a99c"),
						onDarkSoft: token("#d9cfc5"),
						accentOnDark: token("#e58a86"),
						hairline: token("rgba(43, 45, 51, 0.07)"),
						rule: token("rgba(43, 45, 51, 0.12)"),
						success: token("rgba(120, 150, 90, 0.18)"),
					},
				},
				// The site's own face; the app itself still uses fonts.app from @cascade/theme.
				fonts: {
					site: {
						sans: token(
							'"DM Sans Variable", ui-sans-serif, system-ui, sans-serif',
						),
					},
				},
				fontSizes: {
					site: {
						eyebrow: token("0.75rem"),
						small: token("0.906rem"),
						body: token("1rem"),
						lead: token("1.0625rem"),
						large: token("1.25rem"),
						h3: token("1.25rem"),
						h2: token("clamp(2rem, 1.2rem + 2.6vw, 2.875rem)"),
						h1: token("clamp(2.5rem, 1.4rem + 4vw, 4.75rem)"),
						display: token("clamp(2.75rem, 1.6rem + 4vw, 4.25rem)"),
						price: token("3.25rem"),
					},
				},
				shadows: {
					site: {
						card: token("inset 0 0 0 1px rgba(43, 45, 51, 0.07)"),
						cardStrong: token("inset 0 0 0 1px rgba(43, 45, 51, 0.08)"),
						lift: token("0 20px 50px -24px rgba(43, 45, 51, 0.3)"),
						pop: token("0 8px 20px -8px rgba(43, 45, 51, 0.3)"),
						outline: token(
							"0 1px 2px rgba(43, 45, 51, 0.06), 0 24px 60px -24px rgba(43, 45, 51, 0.35), inset 0 0 0 1px rgba(43, 45, 51, 0.07)",
						),
						focus: token("0 0 0 3px rgba(173, 76, 78, 0.4)"),
					},
				},
				sizes: {
					site: {
						maxWidth: token("1280px"),
					},
				},
				spacing: {
					site: {
						gutter: token("clamp(1.25rem, 4vw, 3.5rem)"),
						sectionGap: token("clamp(4rem, 8vw, 6.25rem)"),
					},
				},
			},
		},
	},
});
