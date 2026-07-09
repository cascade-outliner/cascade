interface Tween {
	duration: number;
	ease: string;
}

interface DragAnimationConfig {
	preview: {
		opacity: number;
		scale: number;
		rotationDeg: number;
		intro: Tween;
		follow: Tween;
		maxVisibleRows: number;
		overflowMask: string;
		zIndex: number;
		background: string;
		borderRadius: string;
		boxShadow: string;
	};
	sourceDimOpacity: number;
	settle: {
		flight: Tween & { scaleX: number; scaleY: number };
		spring: Tween;
		fade: Tween & { overlapSeconds: number };
	};
	cancel: Tween & { scale: number };
	displacement: Tween;
	enter: Tween & { offsetY: number; stagger: number };
	leave: Tween & { scale: number };
	completedHide: { delayMs: number };
}

/**
 * Central configuration for all node tree motion (drag-and-drop and
 * expand/collapse).
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
		background: "var(--drag-preview-bg)",
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

	enter: { duration: 0.25, ease: "power2.out", offsetY: -8, stagger: 0.05 },
	leave: { duration: 0.15, ease: "power1.in", scale: 0.96 },

	/** Pause after a task is checked off before it auto-hides (see "hide completed tasks"). */
	completedHide: { delayMs: 1200 },
} as const satisfies DragAnimationConfig;
