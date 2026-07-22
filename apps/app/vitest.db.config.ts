/// <reference types="vitest/config" />
import { defineConfig } from "vite";

export default defineConfig({
	resolve: {
		tsconfigPaths: true,
	},
	test: {
		include: ["src/**/*.db.test.ts"],
		// Procedures use per-user advisory locks, so distinct users per test file
		// are safe, but keep one worker for determinism against a shared database.
		fileParallelism: false,
	},
});
