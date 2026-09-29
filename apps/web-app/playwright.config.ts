import { defineConfig, devices } from "@playwright/test";

const PORT = 3101;

export default defineConfig({
	testDir: "./e2e",
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	reporter: process.env.CI ? [["html", { open: "never" }], ["github"]] : "list",
	use: {
		baseURL: `http://localhost:${PORT}`,
		trace: "on-first-retry",
	},
	projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
	webServer: {
		// CI tests the production build: the dev server compiles on demand, and a
		// cold first page load on a CI runner outlasts the assertion timeout.
		command: process.env.CI
			? "pnpm build && pnpm start"
			: `pnpm dev --port ${PORT} --strictPort`,
		url: `http://localhost:${PORT}`,
		reuseExistingServer: !process.env.CI,
		timeout: 180_000,
		// Empty wins over .env: tests stay local-only and never touch a real database.
		env: { ANTHROPIC_API_KEY: "", DATABASE_URL: "", PORT: String(PORT) },
	},
});
