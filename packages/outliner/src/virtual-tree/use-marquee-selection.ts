import type { RefObject } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { NODE_ROW_ATTRIBUTE } from "./node-rows";

export interface MarqueeRect {
	left: number;
	top: number;
	width: number;
	height: number;
}

interface UseMarqueeSelectionOptions {
	containerRef: RefObject<HTMLDivElement | null>;
	/** Called with every row id currently under the marquee, live as it's dragged. */
	onSelect: (ids: string[]) => void;
}

/** Elements a marquee drag must not start from — anything actually
 * interactive, plus any row itself (dragging a row is reserved for
 * drag-and-drop reordering/reparenting). */
const NON_MARQUEE_SELECTOR = `[${NODE_ROW_ATTRIBUTE}], button, a, input, textarea, [contenteditable]`;

/**
 * Rubber-band ("drag as if it's a canvas") multi-select: a primary-button
 * drag that starts outside every row and every interactive control — the
 * padding above/below the tree, not the rows themselves — tracks a
 * selection rectangle and reports every row whose bounding box intersects
 * it. Hit-testing is plain viewport geometry against currently rendered
 * `[data-node-id]` elements, so (consistent with the rest of the tree being
 * virtualized) it only "sees" rows the virtualizer has mounted.
 */
export function useMarqueeSelection({
	containerRef,
	onSelect,
}: UseMarqueeSelectionOptions) {
	const [rect, setRect] = useState<MarqueeRect | null>(null);
	const originRef = useRef<{ x: number; y: number } | null>(null);

	useEffect(() => {
		const handlePointerMove = (e: PointerEvent) => {
			const origin = originRef.current;
			const container = containerRef.current;
			if (!origin || !container) return;

			const left = Math.min(origin.x, e.clientX);
			const top = Math.min(origin.y, e.clientY);
			const right = Math.max(origin.x, e.clientX);
			const bottom = Math.max(origin.y, e.clientY);
			setRect({ left, top, width: right - left, height: bottom - top });

			const ids: string[] = [];
			for (const el of container.querySelectorAll<HTMLElement>(
				`[${NODE_ROW_ATTRIBUTE}]`,
			)) {
				const box = el.getBoundingClientRect();
				const intersects =
					box.left < right &&
					box.right > left &&
					box.top < bottom &&
					box.bottom > top;
				if (intersects) {
					const id = el.getAttribute(NODE_ROW_ATTRIBUTE);
					if (id) ids.push(id);
				}
			}
			onSelect(ids);
		};

		const handlePointerUp = () => {
			if (!originRef.current) return;
			originRef.current = null;
			setRect(null);
		};

		window.addEventListener("pointermove", handlePointerMove);
		window.addEventListener("pointerup", handlePointerUp);
		return () => {
			window.removeEventListener("pointermove", handlePointerMove);
			window.removeEventListener("pointerup", handlePointerUp);
		};
	}, [containerRef, onSelect]);

	const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
		if (e.button !== 0) return;
		if ((e.target as HTMLElement).closest(NON_MARQUEE_SELECTOR)) return;
		originRef.current = { x: e.clientX, y: e.clientY };
		setRect({ left: e.clientX, top: e.clientY, width: 0, height: 0 });
	}, []);

	return { marqueeRect: rect, onPointerDown };
}
