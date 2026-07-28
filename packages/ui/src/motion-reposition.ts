import { motionDurationsMs, motionEasingsCss } from "@cascade/theme/motion";

/**
 * Whether the OS is set to reduce motion. Safe to call during SSR (returns
 * `false`, matching `MotionConfig reducedMotion="user"`'s server behavior —
 * there's no media query to evaluate yet, and the client re-checks on mount).
 */
export function prefersReducedMotion(): boolean {
	if (typeof window === "undefined" || !window.matchMedia) return false;
	return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** The subset of `HTMLElement` this module needs — narrow so it's trivial to pass a test double. */
export interface RepositionAnimatable {
	animate: (
		keyframes: Keyframe[],
		options: KeyframeAnimationOptions,
	) => unknown;
}

/**
 * The reposition pattern for **virtualized** rows: animate only the row's
 * own `transform` via the Web Animations API. This is deliberately not
 * Motion's `layout` prop or `Reorder` component — those track and animate
 * every affected element in the tree on each change, which doesn't scale to
 * a virtualized list that can hold thousands of rows and only mounts a
 * small visible slice. A single-element WAAPI call stays O(1) regardless of
 * tree size. See this package's README for the full policy.
 *
 * No-ops when there's nothing to animate (`fromY === toY`) or under reduced
 * motion, matching the same policy `MotionConfig reducedMotion="user"`
 * applies to `m.*` components.
 */
export function animateRowReposition(
	element: RepositionAnimatable,
	fromY: number,
	toY: number,
	reducedMotion = prefersReducedMotion(),
): void {
	if (fromY === toY || reducedMotion) return;
	element.animate(
		[
			{ transform: `translateY(${fromY}px)` },
			{ transform: `translateY(${toY}px)` },
		],
		{
			duration: motionDurationsMs.mediumEnter,
			easing: motionEasingsCss.standard,
			fill: "both",
		},
	);
}
