import { domAnimation, LazyMotion, MotionConfig } from "motion/react";
import type { ReactNode } from "react";

/**
 * The shared Motion foundation, mounted once near each app's document root.
 *
 * `LazyMotion` loads only the `domAnimation` feature bundle (opacity,
 * transform, and simple animations — no drag, no layout) so `m.*`
 * components stay lazy-loaded instead of pulling in the full `motion`
 * bundle; `strict` throws if a descendant renders `motion.*` instead of
 * `m.*`, since that would defeat the lazy loading. `MotionConfig` makes
 * every `m.*` animation in the tree honor the OS-level reduced-motion
 * preference automatically (transform/scale animations collapse to an
 * instant end state; see https://motion.dev/docs/react-accessibility).
 *
 * CSS-only primitives (Base UI popup/dialog state transitions, hover/color)
 * don't need this — they stay on Tailwind's `motion-reduce:` variant. Reach
 * for `m.*` only when an animation needs presence (mount/unmount
 * sequencing), orchestration across elements, or gestures.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
	return (
		<LazyMotion features={domAnimation} strict>
			<MotionConfig reducedMotion="user">{children}</MotionConfig>
		</LazyMotion>
	);
}
