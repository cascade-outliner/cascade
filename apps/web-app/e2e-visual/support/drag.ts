import type { Page } from "@playwright/test";

/**
 * Puts the tree into an in-progress drag state (dragged row at reduced
 * opacity, drop indicator showing on the target) without dropping, so a
 * spec can screenshot it. Deliberately does not fire `drop`/`dragend` —
 * callers that need to clean up (leave the tree in its original order)
 * should call `cancelDrag` afterwards.
 *
 * Mirrors e2e/drag-and-drop.spec.ts's `dragRowBefore`: row drag-and-drop
 * (`@atlaskit/pragmatic-drag-and-drop/element/adapter`) uses native HTML5
 * drag events, which Playwright's mouse-based `locator.dragTo()` isn't
 * guaranteed to trigger, so this dispatches synthetic `DragEvent`s with a
 * real `DataTransfer` directly instead.
 */
export async function startDragBefore(
	page: Page,
	draggedNodeId: string,
	targetNodeId: string,
): Promise<void> {
	const sourceSelector = `[data-node-id="${draggedNodeId}"] button[aria-label="Drag to reorder"]`;
	const targetSelector = `[data-node-id="${targetNodeId}"]`;
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

			function fire(
				el: Element,
				type: string,
				clientX: number,
				clientY: number,
			) {
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
			(
				window as unknown as { __visualDragSource?: Element }
			).__visualDragSource = sourceEl;
		},
		[sourceSelector, targetSelector],
	);
}

/** Cancels the drag started by `startDragBefore`, restoring normal row state. */
export async function cancelDrag(page: Page): Promise<void> {
	await page.evaluate(() => {
		const sourceEl = (window as unknown as { __visualDragSource?: Element })
			.__visualDragSource;
		if (!sourceEl) return;
		sourceEl.dispatchEvent(
			new DragEvent("dragend", { bubbles: true, cancelable: true }),
		);
	});
}
