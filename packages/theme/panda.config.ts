import { defineConfig } from "@pandacss/dev";
import presetBase from "@pandacss/preset-base";

const dark = (base: string, _osDark: string) => ({
	value: { base, _osDark },
});

// Light values are the defaults; dark values apply automatically when the
// device is in dark mode.
export default defineConfig({
	// The preset object, not its name, so `panda lib` bundles it into the
	// published design system and consumers don't need it installed.
	presets: [presetBase],
	include: ["./src/**/*.{ts,tsx}"],
	outdir: "styled-system",
	jsxFramework: "react",
	strictTokens: true,
	conditions: {
		narrow: "@media (max-width: 480px)",
		mobile: "@media (max-width: 640px)",
		wide: "@media (min-width: 1200px)",
	},
	theme: {
		tokens: {
			fonts: {
				app: {
					value: '"DM Sans Variable", ui-sans-serif, system-ui, sans-serif',
				},
				mono: { value: '"IBM Plex Mono", ui-monospace, monospace' },
			},
			fontSizes: {
				"100": { value: "0.65rem" },
				"200": { value: "0.7rem" },
				"300": { value: "0.85rem" },
				"400": { value: "0.875rem" },
				"500": { value: "0.9rem" },
				"600": { value: "1rem" },
				"700": { value: "1.05rem" },
				"800": { value: "1.7rem" },
				"900": { value: "1.2rem" },
				"1000": { value: "1.875rem" },
			},
			// 4px base unit, same scale as `spacing` below.
			radii: {
				xs: { value: "2px" },
				sm: { value: "4px" },
				ms: { value: "6px" },
				md: { value: "8px" },
				lg: { value: "12px" },
				xl: { value: "16px" },
				full: { value: "999px" },
				circle: { value: "50%" },
			},
			// Tailwind-style spacing scale: each step is a multiple of a 4px (0.25rem) base unit.
			spacing: {
				"0": { value: "0px" },
				px: { value: "1px" },
				"0.5": { value: "2px" },
				"1": { value: "4px" },
				"1.5": { value: "6px" },
				"2": { value: "8px" },
				"2.5": { value: "10px" },
				"3": { value: "12px" },
				"3.5": { value: "14px" },
				"4": { value: "16px" },
				"5": { value: "20px" },
				"6": { value: "24px" },
				"8": { value: "32px" },
				"9": { value: "36px" },
				"10": { value: "40px" },
				"12": { value: "48px" },
			},
			// Boxes: controls are the interactive squares, dots the decorative ones.
			sizes: {
				"0": { value: "0px" },
				full: { value: "100%" },
				hairline: { value: "1px" },
				icon: { sm: { value: "12px" }, md: { value: "16px" } },
				control: {
					xs: { value: "18px" },
					"2xs": { value: "20px" },
					sm: { value: "22px" },
					md: { value: "24px" },
					lg: { value: "28px" },
					xl: { value: "32px" },
					"2xl": { value: "36px" },
					"3xl": { value: "40px" },
				},
				dot: {
					sm: { value: "3px" },
					md: { value: "4px" },
					lg: { value: "6px" },
					xl: { value: "8px" },
				},
				popup: {
					sm: { value: "220px" },
					md: { value: "280px" },
					lg: { value: "440px" },
					xl: { value: "600px" },
				},
				prose: {
					sm: { value: "230px" },
					md: { value: "360px" },
					lg: { value: "480px" },
					xl: { value: "620px" },
				},
				form: { value: "720px" },
				page: { value: "980px" },
			},
			shadows: {
				none: { value: "none" },
				hairline: { value: "0 0 0 1px {colors.border}" },
				hairlineInset: { value: "inset 0 0 0 1px {colors.borderStrong}" },
				ring: { value: "0 0 0 2px {colors.primary}" },
				ringInset: { value: "inset 0 0 0 1.5px {colors.primary}" },
				float: { value: "0 10px 30px -8px rgba(0, 0, 0, 0.25)" },
				popup: { value: "0 18px 40px -12px rgba(43, 45, 51, 0.3)" },
				focus: {
					value:
						"0 0 0 1px rgba(173, 76, 78, 0.3), 0 3px 10px -3px rgba(0, 0, 0, 0.12)",
				},
				focusRing: { value: "0 0 0 2px rgba(173, 76, 78, 0.35)" },
			},
			zIndex: {
				raised: { value: 1 },
				sticky: { value: 2 },
				header: { value: 10 },
				overlay: { value: 100 },
				popup: { value: 101 },
			},
			// Milliseconds.
			durations: {
				"0": { value: "0s" },
				"50": { value: "50ms" },
				"100": { value: "100ms" },
				"150": { value: "150ms" },
				"200": { value: "200ms" },
				"250": { value: "250ms" },
				"300": { value: "300ms" },
				"400": { value: "400ms" },
				pulse: { value: "1.2s" },
				breathe: { value: "1.8s" },
			},
			easings: {
				/** The house curve: quick start, soft landing. */
				out: { value: "cubic-bezier(0.2, 0, 0, 1)" },
				standard: { value: "ease" },
				enter: { value: "ease-out" },
				exit: { value: "ease-in" },
				inOut: { value: "ease-in-out" },
			},
			opacity: {
				hidden: { value: 0 },
				dim: { value: 0.3 },
				faint: { value: 0.35 },
				disabled: { value: 0.4 },
				muted: { value: 0.55 },
				soft: { value: 0.7 },
				strong: { value: 0.85 },
				full: { value: 1 },
			},
			borderWidths: {
				"0": { value: "0px" },
				thin: { value: "1px" },
				thick: { value: "1.5px" },
				accent: { value: "3px" },
				bar: { value: "4px" },
			},
			lineHeights: {
				none: { value: 1 },
				tight: { value: 1.1 },
				snug: { value: 1.2 },
				title: { value: 1.3 },
				label: { value: 1.4 },
				normal: { value: 1.5 },
				relaxed: { value: 1.6 },
				loose: { value: 1.7 },
				compact: { value: 1.8 },
				/** The capture bar's line box; its dot, chips and buttons line up with it. */
				line: { value: "24px" },
			},
		},
		semanticTokens: {
			colors: {
				white: dark("#ffffff", "#2a2420"),
				canvas: dark("#fcf5ee", "#1c1815"),
				surface: dark("#f9e4d6", "#342b25"),
				danger: dark("#ad4c4e", "#e2897e"),
				muted: dark("#62646b", "#a9a29b"),
				accent: dark("#e38b75", "#eab08f"),
				ink: dark("#2b2d33", "#f3ece4"),
				primary: dark("#ad4c4e", "#e2897e"),
				/** Text and icons on a `primary` background. */
				onPrimary: dark("#ffffff", "#1c1815"),
				placeholder: dark("#a8a7ad", "#756e67"),
				border: dark("rgba(43, 45, 51, 0.08)", "rgba(243, 236, 228, 0.1)"),
				borderStrong: dark(
					"rgba(43, 45, 51, 0.22)",
					"rgba(243, 236, 228, 0.24)",
				),
				overlay: dark("rgba(43, 45, 51, 0.32)", "rgba(0, 0, 0, 0.5)"),
				inkSubtle: dark("rgba(43, 45, 51, 0.1)", "rgba(243, 236, 228, 0.08)"),
				inkSubtleHover: dark(
					"rgba(43, 45, 51, 0.18)",
					"rgba(243, 236, 228, 0.16)",
				),
				/** Calm, informational accents: future due dates. */
				info: dark("#456089", "#a3b8d8"),
				infoMuted: dark("#e3e9f2", "rgba(163, 184, 216, 0.14)"),
				primaryMuted: dark(
					"rgba(173, 76, 78, 0.08)",
					"rgba(226, 137, 126, 0.16)",
				),
				/** Dashed outlines and underlines of things being drafted. */
				primarySoft: {
					value: "color-mix(in srgb, {colors.primary} 55%, transparent)",
				},
				/** The tint on text pulled out into a draft. */
				primaryFaint: {
					value: "color-mix(in srgb, {colors.primary} 14%, transparent)",
				},
			},
		},
	},
});
