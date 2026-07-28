import { motionDurationsMs, motionEasingsCss } from "@cascade/theme/motion";
import { prefersReducedMotion } from "./motion-reposition";

/** The subset of `Animation` this module needs — narrow so it's trivial to pass a test double. */
export interface LifecycleAnimatable {
	animate: (
		keyframes: Keyframe[],
		options: KeyframeAnimationOptions,
	) => { finished: Promise<unknown> } | undefined;
}

/**
 * A newly created/duplicated row's own single-element entrance: opacity plus
 * a small rise, sized like the small-enter semantic pattern
 * (`smallEnterVariants` in `motion-variants.ts`) but via the Web Animations
 * API rather than Motion — this row is one of possibly thousands virtualized
 * in a plain `translateY`-positioned div, so it follows the same
 * single-element-only policy as `animateRowReposition`. The rise animates the
 * CSS `translate` property rather than `transform`: the row's own `transform`
 * already encodes its real virtualized offset (`translateY(start)`), and
 * animating that to an absolute value here would visually snap the row to
 * the wrong position (e.g. the top of the list) for the animation's
 * duration — `translate` composes independently, on top of it. Reduced
 * motion drops the rise but keeps the opacity fade, matching the motion
 * foundation's reduced-motion policy (structural transforms collapse,
 * opacity/color transitions don't).
 */
export function animateRowEnter(
	element: LifecycleAnimatable,
	reducedMotion = prefersReducedMotion(),
): void {
	const rise = reducedMotion ? 0 : 4;
	element.animate(
		[
			{ opacity: 0, translate: `0 ${rise}px` },
			{ opacity: 1, translate: "0 0px" },
		],
		{
			duration: motionDurationsMs.smallEnter,
			easing: motionEasingsCss.standard,
			fill: "backwards",
		},
	);
}

/**
 * A row about to be removed animating out — faster than `animateRowEnter`
 * (`smallExit` vs `smallEnter`), matching the "exits read a little quicker
 * than enters" convention. Returns the underlying animation (or `undefined`
 * if the element can't produce one) so the delete mutation can await
 * `.finished` before actually removing the row from the tree data, giving
 * the fade something to animate instead of an instant unmount. Reduced
 * motion drops the rise but keeps the opacity fade, same as
 * `animateRowEnter`.
 */
export function animateRowExit(
	element: LifecycleAnimatable,
	reducedMotion = prefersReducedMotion(),
): { finished: Promise<unknown> } | undefined {
	const rise = reducedMotion ? 0 : -4;
	return element.animate(
		[
			{ opacity: 1, translate: "0 0px" },
			{ opacity: 0, translate: `0 ${rise}px` },
		],
		{
			duration: motionDurationsMs.smallExit,
			easing: motionEasingsCss.standard,
			fill: "forwards",
		},
	);
}

/**
 * A one-shot, non-repeating background-color flash to locate a row an
 * undo/redo or restore just affected — the row isn't appearing or
 * disappearing, so the opacity/rise pattern above would be the wrong
 * signal. Unaffected by reduced motion: it's a color transition, not a
 * structural transform, so it always plays (same policy as `m.*`
 * components, where "opacity/color transitions still run briefly").
 */
export function flashRowHighlight(element: LifecycleAnimatable): void {
	element.animate(
		[
			{ backgroundColor: "var(--color-accent)" },
			{ backgroundColor: "transparent" },
		],
		{
			duration: motionDurationsMs.feedback,
			easing: motionEasingsCss.standard,
		},
	);
}
