import { gsap } from "gsap";
import { dragAnimationConfig } from "#/ui/nodes/drag-animation/config";
import { NODE_ROW_ATTRIBUTE } from "#/ui/nodes/drag-animation/node-rows";

export interface Point {
	x: number;
	y: number;
}

export interface DragPreviewHandle {
	follow(point: Point): void;
	settleInto(rect: Pick<DOMRect, "left" | "top">): void;
	cancel(): void;
}

/**
 * Cursor-following clone of a single row (rows are flat siblings under
 * virtualization, so there is no subtree element to clone). An optional
 * descendant count is shown as a badge on the preview.
 */
export function createDragPreview(
	sourceRow: HTMLElement,
	grabPoint: Point,
	descendantCount = 0,
): DragPreviewHandle {
	const { preview, settle, cancel, sourceDimOpacity } = dragAnimationConfig;

	const rect = sourceRow.getBoundingClientRect();
	const grabX = grabPoint.x - rect.left;
	const grabY = grabPoint.y - rect.top;

	const el = sourceRow.cloneNode(true) as HTMLElement;
	el.removeAttribute(NODE_ROW_ATTRIBUTE);
	Object.assign(el.style, {
		position: "fixed",
		top: "0",
		left: "0",
		width: `${rect.width}px`,
		margin: "0",
		pointerEvents: "none",
		zIndex: String(preview.zIndex),
		background: preview.background,
		borderRadius: preview.borderRadius,
		boxShadow: preview.boxShadow,
	});

	if (descendantCount > 0) {
		const badge = document.createElement("span");
		badge.textContent = String(descendantCount + 1);
		Object.assign(badge.style, {
			position: "absolute",
			top: "-8px",
			right: "-8px",
			minWidth: "20px",
			height: "20px",
			padding: "0 5px",
			borderRadius: "10px",
			background: "var(--color-redleather, #b3402a)",
			color: "white",
			fontSize: "11px",
			lineHeight: "20px",
			textAlign: "center",
		});
		el.appendChild(badge);
	}

	document.body.appendChild(el);
	sourceRow.style.opacity = String(sourceDimOpacity);

	gsap.set(el, {
		x: rect.left,
		y: rect.top,
		transformOrigin: `${grabX}px ${grabY}px`,
	});
	gsap.to(el, {
		opacity: preview.opacity,
		scale: preview.scale,
		rotate: preview.rotationDeg,
		duration: preview.intro.duration,
		ease: preview.intro.ease,
	});

	const toX = gsap.quickTo(el, "x", preview.follow);
	const toY = gsap.quickTo(el, "y", preview.follow);

	let finished = false;
	const finish = (): boolean => {
		if (finished) return false;
		finished = true;
		sourceRow.style.opacity = "";
		gsap.killTweensOf(el);
		return true;
	};

	return {
		follow({ x, y }) {
			if (finished) return;
			toX(x - grabX);
			toY(y - grabY);
		},

		settleInto(target) {
			if (!finish()) return;
			gsap
				.timeline({ onComplete: () => el.remove() })
				.to(el, {
					x: target.left,
					y: target.top,
					rotate: 0,
					scaleX: settle.flight.scaleX,
					scaleY: settle.flight.scaleY,
					transformOrigin: "50% 0%",
					boxShadow: "0 0 0 rgba(0,0,0,0)",
					duration: settle.flight.duration,
					ease: settle.flight.ease,
				})
				.to(el, {
					scaleX: 1,
					scaleY: 1,
					duration: settle.spring.duration,
					ease: settle.spring.ease,
				})
				.to(
					el,
					{
						opacity: 0,
						duration: settle.fade.duration,
						ease: settle.fade.ease,
					},
					`-=${settle.fade.overlapSeconds}`,
				);
		},

		cancel() {
			if (!finish()) return;
			gsap.to(el, {
				opacity: 0,
				scale: cancel.scale,
				duration: cancel.duration,
				ease: cancel.ease,
				onComplete: () => el.remove(),
			});
		},
	};
}
