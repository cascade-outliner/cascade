import { defineConfig, devices } from "@playwright/test";
import { authFile } from "./e2e-visual/support/env";

/**
 * Screenshot-diff testing for the tree/editor UI (#596). Separate from
 * playwright.config.ts (the functional e2e suite) so a purely visual
 * regression can't get lost among unrelated flakiness, and so this suite can
 * run as its own CI gate — see .github/workflows/visual.yml and the
 * "Visual regression testing" section of CLAUDE.md for how to update
 * baselines when a change is intentional.
 */
export default defineConfig({
	testDir: "./e2e-visual",
	snapshotDir: "./e2e-visual/__screenshots__",
	snapshotPathTemplate: "{snapshotDir}/{arg}{ext}",
	fullyParallel: false,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	// The suite authenticates through the shared e2e account and flips its
	// theme setting per test — concurrent workers would race on that setting.
	workers: 1,
	reporter: process.env.CI
		? [
				["json", { outputFile: "visual-results.json" }],
				["html", { open: "never" }],
			]
		: "list",
	timeout: 30_000,
	expect: {
		timeout: 5_000,
		toHaveScreenshot: {
			animations: "disabled",
			maxDiffPixelRatio: 0.01,
		},
	},
	use: {
		baseURL: "http://localhost:3001",
		trace: "on-first-retry",
		locale: "en-US",
		timezoneId: "UTC",
		colorScheme: "light",
	},
	projects: [
		{ name: "setup", testMatch: /auth\.setup\.ts/ },
		{
			name: "chromium",
			use: {
				...devices["Desktop Chrome"],
				// Fixed regardless of the device preset so screenshots aren't
				// sensitive to Desktop Chrome's default viewport changing.
				viewport: { width: 1280, height: 800 },
				deviceScaleFactor: 1,
				storageState: authFile,
			},
			dependencies: ["setup"],
		},
	],
	webServer: {
		command:
			"pnpm build && node --env-file-if-exists=.env.local .output/server/index.mjs",
		url: "http://localhost:3001",
		reuseExistingServer: !process.env.CI,
		timeout: 120_000,
	},
});
