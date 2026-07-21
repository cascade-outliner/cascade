import type { MarqueeRect } from "./use-marquee-selection";

/** The visible drag rectangle while a marquee selection is in progress.
 * `position: fixed` with viewport coordinates, matching the
 * `getBoundingClientRect()` geometry `useMarqueeSelection` hit-tests
 * against, so no scroll-offset math is needed here. */
export function SelectionMarquee({ rect }: { rect: MarqueeRect | null }) {
	if (!rect) return null;
	return (
		<div
			className="fixed z-40 rounded-sm border border-accent bg-accent/10 pointer-events-none"
			style={{
				left: rect.left,
				top: rect.top,
				width: rect.width,
				height: rect.height,
			}}
		/>
	);
}
