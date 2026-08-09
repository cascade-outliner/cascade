import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [
		// esbuild (vitest's default transform) doesn't emit decorator
		// metadata, which Nest's DI container needs to resolve constructor
		// params by type. swc does, so it stands in for ts-jest here.
		swc.vite({
			module: { type: "es6" },
		}),
	],
	test: {
		root: "./src",
		setupFiles: ["../test/setup-env.ts"],
		coverage: {
			provider: "v8",
			reporter: ["text", "json-summary"],
			reportsDirectory: "../coverage",
			include: ["**/*.ts"],
			exclude: ["**/*.spec.ts", "main.ts"],
		},
	},
});
