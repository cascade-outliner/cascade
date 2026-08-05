/// <reference types="vitest/config" />
import { paraglideVitePlugin } from "@inlang/paraglide-js";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact, { reactCompilerPreset } from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
import { coverageConfigDefaults } from "vitest/config";

export default defineConfig(() => {
	const isTest = process.env.VITEST === "true";

	return {
		resolve: {
			tsconfigPaths: true,
		},
		test: {
			exclude: [
				"**/node_modules/**",
				"**/e2e/**",
				"**/e2e-perf/**",
				"**/e2e-visual/**",
				"**/*.db.test.ts",
			],
			coverage: {
				provider: "v8",
				reporter: ["text", "json-summary"],
				reportsDirectory: "coverage",
				// Without `include`, v8 only reports on files the test run happened
				// to import, so untested code silently drops out of the denominator
				// instead of counting against the percentage.
				include: ["src/**/*.{ts,tsx}"],
				exclude: [...coverageConfigDefaults.exclude, "**/paraglide/**"],
			},
		},
		build: {
			rollupOptions: {
				onLog(level, log, handler) {
					if (log.code === "INVALID_ANNOTATION") return;
					handler(level, log);
				},
			},
		},
		plugins: [
			paraglideVitePlugin({
				project: "./project.inlang",
				outdir: "./src/paraglide",
				strategy: ["cookie", "preferredLanguage", "baseLocale"],
				cookieName: "PARAGLIDE_LOCALE",
				emitTsDeclarations: true,
			}),
			...(!isTest ? [devtools(), nitro(), tailwindcss(), tanstackStart()] : []),
			viteReact(),
			...(!isTest
				? [
						babel({
							presets: [reactCompilerPreset()],
						}),
					]
				: []),
		],
	};
});
