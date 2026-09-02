import type { Plugin } from "vite";

export interface StylexOptions {
	rootDir: string;
	include: string[];
}

export declare function stylex(options: StylexOptions): Plugin;
