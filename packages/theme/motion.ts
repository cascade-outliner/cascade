/**
 * The shared motion token registry: semantic duration/easing values so
 * individual features stop inventing their own raw timings. `theme.css`
 * mirrors these same millisecond values as `--duration-*`/`--ease-*`
 * `@theme` entries (so Tailwind's `duration-*`/`ease-*` utilities exist for
 * CSS-only primitives); this file is the JS-side counterpart for the
 * `motion` library and Web Animations API. Keep both in sync when changing
 * a value.
 *
 * Ranges, from the motion foundation brief: immediate feedback 50-100ms;
 * small enter 150ms; small exit 100ms; medium enter 200-250ms; medium exit
 * 150-200ms; non-blocking settle feedback 400ms. `overshoot` easing is
 * reserved for restrained delight (checkmarks, primary marketing buttons)
 * and must not become the default easing for general UI motion.
 */
export const motionDurationsMs = {
	/** Instant acknowledgement — e.g. a pressed state. */
	immediate: 75,
	/** A small element (popover, menu, checkbox) appearing. */
	smallEnter: 150,
	/** A small element leaving; exits read best a little quicker than enters. */
	smallExit: 100,
	/** A larger element (dialog, drawer) appearing. */
	mediumEnter: 225,
	/** A larger element leaving. */
	mediumExit: 175,
	/** A non-blocking settle, e.g. a save confirmation fading in. */
	feedback: 400,
} as const;

export type MotionDurationToken = keyof typeof motionDurationsMs;

/** Same values as {@link motionDurationsMs}, in seconds, for the `motion` library's `transition.duration`. */
export const motionDurations = Object.fromEntries(
	Object.entries(motionDurationsMs).map(([token, ms]) => [token, ms / 1000]),
) as Record<MotionDurationToken, number>;

export const motionEasingsCss = {
	/** Matches Tailwind's built-in `ease-out`; spelled out for `motion`/WAAPI callers that need a cubic-bezier array. */
	standard: "cubic-bezier(0, 0, 0.2, 1)",
	overshoot: "cubic-bezier(0.34, 1.56, 0.64, 1)",
} as const;

export type MotionEasingToken = keyof typeof motionEasingsCss;

/** {@link motionEasingsCss}, as the `[x1, y1, x2, y2]` tuples `motion`'s `transition.ease` expects. */
export const motionEasings = {
	standard: [0, 0, 0.2, 1],
	overshoot: [0.34, 1.56, 0.64, 1],
} as const satisfies Record<MotionEasingToken, [number, number, number, number]>;
