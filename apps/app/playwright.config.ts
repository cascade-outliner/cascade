import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
	testDir: "./e2e",
	fullyParallel: true,
	retries: process.env.CI ? 2 : 0,
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
				storageState: "e2e/.auth/state.json",
			},
			dependencies: ["setup"],
		},
	],
	webServer: {
		// `pnpm start` alone expects env vars from the deploy platform; locally
		// they live in .env.local, same as `pnpm dev`.
		command: "pnpm build && node --env-file=.env.local .output/server/index.mjs",
		url: "http://localhost:3001",
		reuseExistingServer: !process.env.CI,
		timeout: 120_000,
	},
});
