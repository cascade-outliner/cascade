import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [
		swc.vite({
			module: { type: "es6" },
		}),
	],
	test: {
		root: "./src",
		setupFiles: ["../test/setup-env.ts"],
		include: ["**/*.db.test.ts"],
		// Keep one worker for determinism against a shared database, matching
		// apps/web-app's vitest.db.config.ts.
		fileParallelism: false,
	},
});
