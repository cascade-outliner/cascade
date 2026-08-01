import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		coverage: {
			provider: "v8",
			reporter: ["text", "json-summary"],
			reportsDirectory: "coverage",
			// Without `include`, v8 only reports on files the test run happened
			// to import, so untested code silently drops out of the denominator
			// instead of counting against the percentage.
			include: ["src/**/*.{ts,tsx}"],
		},
	},
});
