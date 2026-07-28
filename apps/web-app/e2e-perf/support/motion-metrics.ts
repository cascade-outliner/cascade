import type { Page } from "@playwright/test";

/** Frame gaps above this are treated as dropped/janky (well past a 60Hz frame budget). */
const LONG_FRAME_THRESHOLD_MS = 50;

export interface FrameSampleSummary {
	frameCount: number;
	maxGapMs: number;
	longFrames: number;
}

interface FrameSamplingWindow {
	__cascadePerfFrameGaps?: number[];
	__cascadePerfSampling?: boolean;
}

async function startFrameSampling(page: Page): Promise<void> {
	await page.evaluate(() => {
		const w = window as unknown as FrameSamplingWindow;
		w.__cascadePerfFrameGaps = [];
		w.__cascadePerfSampling = true;
		let last = performance.now();
		function tick() {
			if (!w.__cascadePerfSampling) return;
			const now = performance.now();
			w.__cascadePerfFrameGaps?.push(now - last);
			last = now;
			requestAnimationFrame(tick);
		}
		requestAnimationFrame(tick);
	});
}

async function stopFrameSampling(page: Page): Promise<FrameSampleSummary> {
	return page.evaluate((longFrameThresholdMs) => {
		const w = window as unknown as FrameSamplingWindow;
		w.__cascadePerfSampling = false;
		const gaps = w.__cascadePerfFrameGaps ?? [];
		return {
			frameCount: gaps.length,
			maxGapMs: gaps.length > 0 ? Math.max(...gaps) : 0,
			longFrames: gaps.filter((gap) => gap > longFrameThresholdMs).length,
		};
	}, LONG_FRAME_THRESHOLD_MS);
}

export interface ActionMeasurement<T> {
	result: T;
	actionMs: number;
	frames: FrameSampleSummary;
}

/**
 * Times `action` and samples requestAnimationFrame gaps for `settleMs` after
 * it resolves, so a slow frame caused by an in-flight WAAPI reposition
 * animation is captured rather than just the synchronous DOM update. Used to
 * compare the candidate single-row motion effect (issue #509) on vs off.
 */
export async function measureAction<T>(
	page: Page,
	action: () => Promise<T>,
	settleMs = 500,
): Promise<ActionMeasurement<T>> {
	await startFrameSampling(page);
	const start = performance.now();
	const result = await action();
	const actionMs = performance.now() - start;
	await page.waitForTimeout(settleMs);
	const frames = await stopFrameSampling(page);
	return { result, actionMs, frames };
}

/** Every currently-mounted tree row, virtualized slice only. */
export function mountedRowCount(page: Page): Promise<number> {
	return page.locator('[role="treeitem"]').count();
}

/**
 * Row drag-and-drop (`@atlaskit/pragmatic-drag-and-drop/element/adapter`)
 * uses native HTML5 drag events, which Playwright's mouse-based
 * `locator.dragTo()` isn't guaranteed to trigger (it simulates
 * mousedown/mousemove/mouseup, not a real `dragstart`). Dispatching
 * synthetic `DragEvent`s with a real `DataTransfer` directly is the
 * standard headless-testing workaround for native HTML5 DnD — the
 * adapter's listeners don't check `event.isTrusted`, so untrusted events
 * drive it the same way a real drag would.
 */
export async function nativeRowDragAndDrop(
	page: Page,
	sourceSelector: string,
	targetSelector: string,
): Promise<void> {
	await page.evaluate(
		([source, target]) => {
			const sourceEl = document.querySelector(source);
			const targetEl = document.querySelector(target);
			if (!sourceEl || !targetEl) {
				throw new Error(`drag source/target not found: ${source} / ${target}`);
			}
			const targetRect = targetEl.getBoundingClientRect();
			const x = targetRect.left + 8;
			const y = targetRect.top + 2;
			const dataTransfer = new DataTransfer();

			function fire(el: Element, type: string, clientX: number, clientY: number) {
				const event = new DragEvent(type, {
					bubbles: true,
					cancelable: true,
					clientX,
					clientY,
				});
				Object.defineProperty(event, "dataTransfer", { value: dataTransfer });
				el.dispatchEvent(event);
			}

			fire(sourceEl, "dragstart", 0, 0);
			fire(targetEl, "dragenter", x, y);
			fire(targetEl, "dragover", x, y);
			fire(targetEl, "drop", x, y);
			fire(sourceEl, "dragend", x, y);
		},
		[sourceSelector, targetSelector],
	);
}
