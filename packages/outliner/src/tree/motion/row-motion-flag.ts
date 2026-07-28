declare global {
	interface Window {
		/**
		 * Perf-harness-only escape hatch for the candidate single-row WAAPI
		 * reposition effect (`animateRowReposition`, see
		 * `@cascade/ui/motion-reposition`), toggled by
		 * `apps/web-app/e2e-perf/virtual-tree-motion.spec.ts` via
		 * `page.addInitScript` to compare motion enabled/disabled without
		 * touching rendered markup (so there's no SSR/hydration mismatch to
		 * manage). Never set outside that harness — real users always get
		 * `false`, i.e. rows reposition instantly with no animation, until
		 * issue #509's perf gate passes and this becomes a real feature flag.
		 */
		__CASCADE_ROW_MOTION__?: boolean;
	}
}

export function isRowMotionEnabled(): boolean {
	return (
		typeof window !== "undefined" && window.__CASCADE_ROW_MOTION__ === true
	);
}
