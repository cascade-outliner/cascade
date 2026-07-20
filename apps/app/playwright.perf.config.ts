import { defineConfig, devices } from "@playwright/test";
import { authFile } from "./e2e-perf/support/env";

/**
 * Separate from playwright.config.ts (the default e2e suite) so UI perf specs
 * never run as part of every PR's e2e job — they need a large seeded tree
 * (e2e-perf/seed.ts) first, and their assertions are about virtualization
 * staying bounded rather than typical feature correctness. See CLAUDE.md's
 * performance-testing section for how to run this locally, and
 * .github/workflows/perf.yml for how CI wires it up.
 */
export default defineConfig({
	testDir: "./e2e-perf",
	fullyParallel: false,
	retries: process.env.CI ? 1 : 0,
	reporter: process.env.CI ? "html" : "list",
	timeout: 60_000,
	use: {
		baseURL: "http://localhost:3001",
		trace: "on-first-retry",
	},
	projects: [
		{ name: "setup", testMatch: /auth\.setup\.ts/ },
		{
			name: "chromium",
			use: {
				...devices["Desktop Chrome"],
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
