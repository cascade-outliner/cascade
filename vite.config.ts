/// <reference types="vitest/config" />

import path from "node:path";
import { fileURLToPath } from "node:url";
import babel from "@rolldown/plugin-babel";
import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact, { reactCompilerPreset } from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

const dirname =
	typeof __dirname !== "undefined"
		? __dirname
		: path.dirname(fileURLToPath(import.meta.url));

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
const config = defineConfig({
	resolve: {
		tsconfigPaths: true,
	},
	plugins: [
		devtools(),
		// ponytail: nitro crashes vitest's DevEnvironment; skip it during test runs
		...(!process.env.VITEST
			? [nitro({ config: { rollupConfig: { external: [/^@sentry\//] } } })]
			: []),
		tailwindcss(),
		tanstackStart(),
		viteReact(),
		babel({
			presets: [reactCompilerPreset()],
		}),
	],
	test: {
		projects: [
			{
				extends: true,
				test: {
					name: "unit",
					environment: "jsdom",
					include: ["src/**/*.test.{ts,tsx}"],
					setupFiles: ["src/test-setup.ts"],
				},
			},
			{
				extends: true,
				plugins: [
					storybookTest({ configDir: path.join(dirname, ".storybook") }),
				],
				test: {
					name: "storybook",
					browser: {
						enabled: true,
						headless: true,
						provider: playwright({}),
						instances: [{ browser: "chromium" }],
					},
				},
			},
		],
	},
});
export default config;
