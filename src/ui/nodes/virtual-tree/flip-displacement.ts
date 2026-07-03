import { gsap } from "gsap";
import { dragAnimationConfig } from "@/ui/nodes/drag-animation/config";
import { NODE_ROW_ATTRIBUTE } from "@/ui/nodes/drag-animation/node-rows";

/**
 * One-shot FLIP for drop displacement. The optimistic cache splice makes the
 * reflow synchronous, so: capture rendered row positions before the splice,
 * then after the React commit tween each surviving row from its old position
 * back to zero. No rAF loop, no settle detection.
 */

export function captureRowPositions(
	container: HTMLElement,
): Map<string, number> {
	const positions = new Map<string, number>();
	for (const el of container.querySelectorAll<HTMLElement>(
		`[${NODE_ROW_ATTRIBUTE}]`,
	)) {
		const id = el.getAttribute(NODE_ROW_ATTRIBUTE);
		if (id) positions.set(id, el.getBoundingClientRect().top);
	}
	return positions;
}

export function playDisplacement(
	container: HTMLElement,
	before: Map<string, number>,
	ignoredId: string,
): void {
	const { displacement } = dragAnimationConfig;
	for (const el of container.querySelectorAll<HTMLElement>(
		`[${NODE_ROW_ATTRIBUTE}]`,
	)) {
		const id = el.getAttribute(NODE_ROW_ATTRIBUTE);
		if (!id || id === ignoredId) continue;
		const previousTop = before.get(id);
		if (previousTop === undefined) continue;
		const delta = previousTop - el.getBoundingClientRect().top;
		if (Math.abs(delta) < 1) continue;
		gsap.fromTo(
			el,
			{ y: delta },
			{ y: 0, duration: displacement.duration, ease: displacement.ease },
		);
	}
}
