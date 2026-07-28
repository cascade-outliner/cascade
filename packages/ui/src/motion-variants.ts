import { motionDurations, motionEasings } from "@cascade/theme/motion";
import type { Transition, Variants } from "motion/react";

const standardEase = motionEasings.standard;

/**
 * The four semantic motion patterns from the motion foundation brief. Pick
 * by what the element is doing, not by feel — that's what keeps timings
 * consistent across features. `enter`/`exit` are sized (an element's own
 * scale, e.g. a dialog vs. a toast); `reposition`/`feedback` aren't.
 */

/** A small element (popover, menu, checkbox) appearing. */
export const smallEnterVariants: Variants = {
	initial: { opacity: 0, scale: 0.98 },
	animate: {
		opacity: 1,
		scale: 1,
		transition: { duration: motionDurations.smallEnter, ease: standardEase },
	},
};

/** A small element leaving. Pair with `AnimatePresence` to run on unmount. */
export const smallExitVariants: Variants = {
	exit: {
		opacity: 0,
		scale: 0.98,
		transition: { duration: motionDurations.smallExit, ease: standardEase },
	},
};

/** A larger element (dialog, drawer) appearing. */
export const mediumEnterVariants: Variants = {
	initial: { opacity: 0, scale: 0.98 },
	animate: {
		opacity: 1,
		scale: 1,
		transition: { duration: motionDurations.mediumEnter, ease: standardEase },
	},
};

/** A larger element leaving. Pair with `AnimatePresence` to run on unmount. */
export const mediumExitVariants: Variants = {
	exit: {
		opacity: 0,
		scale: 0.98,
		transition: { duration: motionDurations.mediumExit, ease: standardEase },
	},
};

/**
 * A bounded element reflowing in place (e.g. a small list re-sorting).
 * Opacity/scale-free — reposition is a position change, not an
 * appear/disappear. Not for virtualized tree rows: see
 * `motion-reposition.ts` and the tree-row policy in this package's README.
 */
export const repositionTransition: Transition = {
	duration: motionDurations.mediumEnter,
	ease: standardEase,
};

/**
 * A non-blocking settle, e.g. a save confirmation fading in without moving
 * anything else on the page.
 */
export const feedbackVariants: Variants = {
	initial: { opacity: 0 },
	animate: {
		opacity: 1,
		transition: { duration: motionDurations.feedback, ease: standardEase },
	},
};

/**
 * Restrained delight only: checkmarks and primary marketing buttons. Not a
 * default for general UI motion — see `ease-overshoot` in `theme.css` for
 * the CSS-only equivalent used by `packages/ui/src/checkbox.tsx`,
 * `button.tsx`, and `action.tsx`.
 */
export const delightTransition: Transition = {
	duration: motionDurations.feedback,
	ease: motionEasings.overshoot,
};
