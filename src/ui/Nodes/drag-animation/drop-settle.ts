import { gsap } from "gsap";
import { dragAnimationConfig } from "#/ui/Nodes/drag-animation/config";
import type { DragPreviewHandle } from "#/ui/Nodes/drag-animation/drag-preview";
import { LayoutShiftTracker } from "#/ui/Nodes/drag-animation/layout-shift-tracker";
import {
	findNodeRow,
	getAllNodeRows,
	getNodeRowId,
} from "#/ui/Nodes/drag-animation/node-rows";
import { SettleDetector } from "#/ui/Nodes/drag-animation/settle-detector";

export function animateDropSettle(
	preview: DragPreviewHandle,
	nodeId: string,
	sourceRow: HTMLElement,
): void {
	const { settleDetection, displacement } = dragAnimationConfig;

	const tracker = new LayoutShiftTracker(
		settleDetection.movementThresholdPx,
		nodeId,
	);
	const detector = new SettleDetector(
		settleDetection,
		sourceRow.getBoundingClientRect().top,
	);

	const animateDisplacedRows = () => {
		const rows = new Map<string, HTMLElement>();
		const samples = [];
		for (const el of getAllNodeRows()) {
			const id = getNodeRowId(el);
			if (!id) continue;
			const visualTop = el.getBoundingClientRect().top;
			const tweenOffset = Number(gsap.getProperty(el, "y")) || 0;
			rows.set(id, el);
			samples.push({ id, visualTop, layoutTop: visualTop - tweenOffset });
		}
		for (const { id, fromOffsetPx } of tracker.update(samples)) {
			const el = rows.get(id);
			if (!el) continue;
			gsap.fromTo(
				el,
				{ y: fromOffsetPx },
				{
					y: 0,
					duration: displacement.duration,
					ease: displacement.ease,
					overwrite: true,
				},
			);
		}
	};

	animateDisplacedRows();

	const tick = () => {
		animateDisplacedRows();

		const row = findNodeRow(nodeId);
		const rect = row?.getBoundingClientRect() ?? null;
		const verdict = detector.next(
			row && rect ? { sameElement: row === sourceRow, top: rect.top } : null,
		);

		if (verdict === "waiting") {
			requestAnimationFrame(tick);
		} else if (rect) {
			preview.settleInto(rect);
		} else {
			preview.cancel();
		}
	};
	requestAnimationFrame(tick);
}
