import { defineConfig } from "@pandacss/dev";

export default defineConfig({
	designSystem: "@cascade/theme",
	include: ["./src/**/*.{ts,tsx}", "../../packages/ui/src/**/*.{ts,tsx}"],
	exclude: ["./src/styled-system/**"],
	outdir: "src/styled-system",
	importMap: "#/styled-system",
	jsxFramework: "react",
	strictTokens: true,
	globalCss: {
		// Onboarding steps slide in the direction of travel.
		'html[data-onboarding-back="true"]': { "--onboarding-shift": "-24px" },
	},
});
