import type { Plugin } from "vite";

export interface StylexOptions {
	rootDir: string;
	include: string[];
	/** Import aliases the compiler must follow to find `.stylex.ts` files, e.g. `{ "@/*": ["/abs/src/*"] }`. */
	aliases?: Record<string, string | readonly string[]>;
}

export declare function stylex(options: StylexOptions): Plugin;
