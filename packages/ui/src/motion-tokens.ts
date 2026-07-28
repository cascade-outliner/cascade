/**
 * Re-exports the shared motion token registry so `motion`/WAAPI callers in
 * this package (and its consumers) don't need a separate `@cascade/theme`
 * import alongside `@cascade/ui/motion-*`. See `@cascade/theme/motion` for
 * the token values and the CSS-side `duration-*`/`ease-*` utility names.
 */
export {
	type MotionDurationToken,
	type MotionEasingToken,
	motionDurations,
	motionDurationsMs,
	motionEasings,
	motionEasingsCss,
} from "@cascade/theme/motion";
