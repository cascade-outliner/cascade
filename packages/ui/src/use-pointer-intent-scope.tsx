import type { RefObject } from "react";
import { useLayoutEffect, useMemo, useRef } from "react";
import {
	type IntentCandidateRect,
	type PointerSample,
	resolveIntentTarget,
} from "./pointer-intent";
import type {
	PointerIntentCandidate,
	PointerIntentScope,
} from "./pointer-intent-context";

const MAX_RADIUS = 24;
const TOUCH_RADIUS = 20;
const JITTER_THRESHOLD = 4;
const SAMPLE_BUFFER_SIZE = 8;
/** Ignore a click whose most recent recorded pointer sample is older than this —
 * guards against reusing stale mouse samples for an unrelated keyboard-activated click. */
const STALE_GESTURE_MS = 500;

interface ActivePointer {
	pointerId: number;
	pointerType: string;
	samples: PointerSample[];
}

/**
 * Sets up one predictive click-intent scope over `containerRef`'s subtree: a
 * near-miss click that was trending toward a registered candidate (see
 * `usePointerIntentTarget`) gets redirected to that candidate instead of
 * falling through to empty space or a neighboring control.
 */
export function usePointerIntentScope(
	containerRef: RefObject<HTMLElement | null>,
): PointerIntentScope {
	const candidatesRef = useRef(new Map<string, PointerIntentCandidate>());
	const activePointerRef = useRef<ActivePointer | null>(null);

	const scope = useMemo<PointerIntentScope>(
		() => ({
			register(candidate) {
				candidatesRef.current.set(candidate.id, candidate);
				return () => {
					if (candidatesRef.current.get(candidate.id) === candidate) {
						candidatesRef.current.delete(candidate.id);
					}
				};
			},
		}),
		[],
	);

	useLayoutEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		function pushSample(pointer: ActivePointer, event: PointerEvent) {
			pointer.samples.push({
				x: event.clientX,
				y: event.clientY,
				t: event.timeStamp,
			});
			if (pointer.samples.length > SAMPLE_BUFFER_SIZE) pointer.samples.shift();
		}

		function onPointerDown(event: PointerEvent) {
			activePointerRef.current = {
				pointerId: event.pointerId,
				pointerType: event.pointerType,
				samples: [{ x: event.clientX, y: event.clientY, t: event.timeStamp }],
			};
		}

		function onPointerMove(event: PointerEvent) {
			const pointer = activePointerRef.current;
			if (pointer && pointer.pointerId === event.pointerId)
				pushSample(pointer, event);
		}

		function onPointerUp(event: PointerEvent) {
			const pointer = activePointerRef.current;
			if (pointer && pointer.pointerId === event.pointerId)
				pushSample(pointer, event);
		}

		// A real (non-capture) listener attached directly on the scope container,
		// not document/root: bubble order runs this before React's root-delegated
		// click listener, so stopPropagation() here reliably suppresses a
		// wrongly-targeted element's own onClick when we redirect elsewhere.
		function onClick(event: MouseEvent) {
			const target = event.target;
			if (!(target instanceof Node)) return;

			const registered = Array.from(candidatesRef.current.values());
			if (registered.length === 0) return;
			// Never second-guess a click that already landed on (or inside) a
			// registered candidate — only near-misses are eligible for redirect.
			if (registered.some((candidate) => candidate.element.contains(target)))
				return;

			const pointer = activePointerRef.current;
			if (!pointer) return;
			const lastSample = pointer.samples[pointer.samples.length - 1];
			if (!lastSample || event.timeStamp - lastSample.t > STALE_GESTURE_MS)
				return;

			const candidateRects: IntentCandidateRect[] = registered.map(
				(candidate) => {
					const rect = candidate.element.getBoundingClientRect();
					return {
						id: candidate.id,
						rect: {
							x: rect.x,
							y: rect.y,
							width: rect.width,
							height: rect.height,
						},
						activatable: candidate.activatable,
					};
				},
			);

			const winnerId = resolveIntentTarget(pointer.samples, candidateRects, {
				pointerType: pointer.pointerType,
				maxRadius: MAX_RADIUS,
				touchRadius: TOUCH_RADIUS,
				jitterThreshold: JITTER_THRESHOLD,
			});
			const winner = winnerId ? candidatesRef.current.get(winnerId) : null;
			if (!winner) return;

			event.preventDefault();
			event.stopPropagation();
			winner.element.click();
		}

		container.addEventListener("pointerdown", onPointerDown, { passive: true });
		container.addEventListener("pointermove", onPointerMove, { passive: true });
		container.addEventListener("pointerup", onPointerUp, { passive: true });
		container.addEventListener("click", onClick);

		return () => {
			container.removeEventListener("pointerdown", onPointerDown);
			container.removeEventListener("pointermove", onPointerMove);
			container.removeEventListener("pointerup", onPointerUp);
			container.removeEventListener("click", onClick);
		};
	}, [containerRef]);

	return scope;
}
