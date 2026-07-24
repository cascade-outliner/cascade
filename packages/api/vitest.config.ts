/// <reference types="vitest/config" />
import { defineConfig } from "vite";

export default defineConfig({
	test: {
		exclude: ["**/node_modules/**", "**/*.db.test.ts"],
	},
});
