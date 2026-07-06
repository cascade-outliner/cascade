/// <reference types="vitest/config" />
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact, { reactCompilerPreset } from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

export default defineConfig({
	resolve: {
		tsconfigPaths: true,
	},
	test: {
		exclude: ["**/node_modules/**", "**/e2e/**"],
	},
	plugins: [
		devtools(),
		nitro(),
		tailwindcss(),
		tanstackStart(),
		viteReact(),
		babel({
			presets: [reactCompilerPreset()],
		}),
	],
});
