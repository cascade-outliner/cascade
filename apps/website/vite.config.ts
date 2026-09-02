import path from "node:path";
import { fileURLToPath } from "node:url";
import { stylex } from "@cascade/config/vite-stylex";
import { withPayload } from "@payloadcms/tanstack-start";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import rsc from "@vitejs/plugin-rsc";
import { defineConfig } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../..");

export default defineConfig(
	withPayload(
		({ pluginOptions }) => ({
			plugins: [
				stylex({
					rootDir,
					include: [
						path.join(__dirname, "src/**/*.{ts,tsx}"),
						path.join(rootDir, "packages/theme/src/**/*.{ts,tsx}"),
					],
				}),
				rsc(pluginOptions.rsc),
				tanstackStart(pluginOptions.tanstackStart),
				viteReact(pluginOptions.react),
			],
			resolve: {
				alias: {
					"@/": `${path.resolve(__dirname, "src")}/`,
				},
			},
			server: {
				port: 3000,
				warmup: {
					clientFiles: [
						"./src/app/__root.tsx",
						"./src/app/_payload.tsx",
						"./src/app/_payload/admin.index.tsx",
						"./src/app/_payload/admin.$.tsx",
					],
				},
			},
		}),
		{ payloadConfigPath: path.resolve(__dirname, "src", "payload.config.ts") },
	),
);
