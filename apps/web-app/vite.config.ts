import path from "node:path";
import { fileURLToPath } from "node:url";
import { stylex } from "@cascade/config/vite-stylex";
import { devtools } from "@tanstack/devtools-vite";

import { tanstackStart } from "@tanstack/react-start/plugin/vite";

import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../..");

const config = defineConfig({
	resolve: { tsconfigPaths: true },
	plugins: [
		devtools(),
		nitro({ rollupConfig: { external: [/^@sentry\//] } }),
		stylex({
			rootDir,
			include: [
				path.join(__dirname, "src/**/*.{ts,tsx}"),
				path.join(rootDir, "packages/ui/src/**/*.{ts,tsx}"),
				path.join(rootDir, "packages/theme/src/**/*.{ts,tsx}"),
			],
		}),
		tanstackStart(),
		viteReact(),
	],
	server: {
		port: 3001,
	},
});

export default config;
