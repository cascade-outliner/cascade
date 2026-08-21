import { defineConfig } from "cva";
import { twMerge } from "tailwind-merge";

export const { cva } = defineConfig({
	hooks: {
		onComplete: (className) => twMerge(className),
	},
});
