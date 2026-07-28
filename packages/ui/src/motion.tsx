/**
 * Re-exports the `m` namespace (not `motion`) so consumers can't accidentally
 * import the full, eager `motion.*` bundle — that would defeat the
 * `LazyMotion` wrapping in `motion-provider.tsx`. `m.*` components only
 * render inside a `MotionProvider` (or another `LazyMotion` ancestor).
 */

export type { Transition, Variants } from "motion/react";
export { AnimatePresence, m } from "motion/react";
