import { defineConfig, devices } from "@playwright/test";

const PORT = 3102;

/**
 * Performance suite: production build, one worker so runs don't compete for CPU.
 * Too slow for every PR; run on main or nightly and watch `perf-results/` over time.
 */
export default defineConfig({
	testDir: "./e2e-perf",
	workers: 1,
	retries: 0,
	timeout: 180_000,
	forbidOnly: !!process.env.CI,
	reporter: process.env.CI ? [["html", { open: "never" }], ["github"]] : "list",
	use: {
		baseURL: `http://localhost:${PORT}`,
		trace: "retain-on-failure",
	},
	projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
	webServer: {
		command: "pnpm build && pnpm start",
		url: `http://localhost:${PORT}`,
		reuseExistingServer: !process.env.CI,
		timeout: 300_000,
		env: { DATABASE_URL: "", PORT: String(PORT) },
	},
});
