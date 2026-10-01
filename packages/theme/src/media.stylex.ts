import * as stylex from "@stylexjs/stylex";

export const media = stylex.defineConsts({
	mobile: "@media (max-width: 640px)",
	reducedMotion: "@media (prefers-reduced-motion: reduce)",
});
