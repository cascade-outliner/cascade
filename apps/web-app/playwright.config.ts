import { defineConfig, devices } from "@playwright/test";
import { authFile } from "./e2e/support/env";

export default defineConfig({
	testDir: "./e2e",
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	// The e2e suite intentionally exercises account-wide settings and premium
	// state. It authenticates through one shared account, so concurrent workers
	// would race while changing that state.
	workers: 1,
	reporter: process.env.CI ? "html" : "list",
	timeout: 30_000,
	expect: {
		timeout: 5_000,
	},
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
		// `pnpm start` alone expects env vars from the deploy platform; locally
		// they live in .env.local, same as `pnpm dev`. In CI there's no
		// .env.local at all — env vars come from the workflow directly — so use
		// the "if-exists" variant rather than the hard-erroring `--env-file`.
		command:
			"pnpm build && node --env-file-if-exists=.env.local .output/server/index.mjs",
		url: "http://localhost:3001",
		reuseExistingServer: !process.env.CI,
		timeout: 120_000,
	},
});
