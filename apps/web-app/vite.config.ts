import pandacss from "@pandacss/vite";
import { devtools } from "@tanstack/devtools-vite";

import { tanstackStart } from "@tanstack/react-start/plugin/vite";

import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

const config = defineConfig({
	resolve: { tsconfigPaths: true },
	plugins: [
		devtools(),
		nitro({ rollupConfig: { external: [/^@sentry\//] } }),
		pandacss(),
		tanstackStart({ spa: { enabled: true } }),
		viteReact(),
	],
	build: {
		rolldownOptions: {
			// Deps like react-router and react-error-boundary ship "use client"; meaningless outside RSC.
			onLog(level, log, defaultHandler) {
				if (log.code !== "MODULE_LEVEL_DIRECTIVE") {
					defaultHandler(level, log);
				}
			},
		},
	},
	server: {
		port: 3001,
	},
});

export default config;
