/**
 * Central configuration for all node drag-and-drop motion.
 */
export const dragAnimationConfig = {
	preview: {
		opacity: 0.75,
		scale: 1.02,
		rotationDeg: 2.5,
		intro: { duration: 0.2, ease: "power2.out" },
		follow: { duration: 0.3, ease: "power3" },
		maxVisibleRows: 6,
		overflowMask: "linear-gradient(to bottom, black 60%, transparent)",
		zIndex: 1000,
		background: "var(--color-ginger)",
		borderRadius: "6px",
		boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
	},

	sourceDimOpacity: 0.3,

	settle: {
		flight: { duration: 0.2, ease: "power3.in", scaleX: 1.03, scaleY: 0.9 },
		spring: { duration: 0.45, ease: "elastic.out(1, 0.5)" },
		fade: { duration: 0.2, ease: "power1.in", overlapSeconds: 0.3 },
	},

	cancel: { duration: 0.15, ease: "power2.in", scale: 0.96 },

	displacement: { duration: 0.45, ease: "power3.out" },

	settleDetection: {
		stableFrames: 8,
		maxFrames: 150,
		movementThresholdPx: 1,
	},
} as const;
