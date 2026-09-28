import * as stylex from "@stylexjs/stylex";

// StyleX doesn't order overlapping media queries, so a property that needs
// three values (desktop / tablet / phone) pairs `tabletOnly` with `mobile`
// instead of `tablet`.
export const media = stylex.defineConsts({
	mobile: "@media (max-width: 640px)",
	tablet: "@media (max-width: 900px)",
	tabletOnly: "@media (min-width: 641px) and (max-width: 900px)",
	reducedMotion: "@media (prefers-reduced-motion: reduce)",
});
