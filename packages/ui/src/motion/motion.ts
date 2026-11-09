import { duration, easing } from "@cascade/theme/tokens.stylex";
import * as stylex from "@stylexjs/stylex";

const rise = stylex.keyframes({
	from: { opacity: 0, transform: "translateY(8px)" },
});

export const motion = stylex.create({
	floating: {
		transformOrigin: "var(--transform-origin)",
		transitionProperty: "transform, opacity",
		transitionDuration: duration["200"],
		transitionTimingFunction: easing.pop,
		"[data-starting-style]": {
			opacity: 0,
			transform: "scale(0.94)",
		},
		"[data-ending-style]": {
			opacity: 0,
			transform: "scale(0.97)",
			transitionDuration: duration["100"],
			transitionTimingFunction: easing.exit,
		},
	},
	backdrop: {
		transitionProperty: "opacity",
		transitionDuration: duration["200"],
		transitionTimingFunction: easing.soft,
		"[data-starting-style]": {
			opacity: 0,
		},
		"[data-ending-style]": {
			opacity: 0,
			transitionDuration: duration["150"],
			transitionTimingFunction: easing.exit,
		},
	},
	press: {
		transitionProperty: "transform, background-color, color, opacity",
		transitionDuration: duration["150"],
		transitionTimingFunction: easing.pop,
		transform: { default: null, ":enabled:active": "scale(0.96)" },
	},
	rise: {
		animationName: {
			default: rise,
			"@media (prefers-reduced-motion: reduce)": "none",
		},
		animationDuration: duration["400"],
		animationTimingFunction: easing.soft,
		animationFillMode: "backwards",
	},
});
