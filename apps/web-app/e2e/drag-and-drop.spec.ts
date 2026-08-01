import { buildVisibleTree } from "@cascade/outliner/build-visible-tree";
import type { Page } from "@playwright/test";
import { toNodeSlug } from "@/features/nodes/model/node-slug";
import { expect, test } from "./support/fixtures";

function lexicalContent(text: string) {
	return {
		root: {
			type: "root" as const,
			children: [
				{
					type: "paragraph" as const,
					children: [{ type: "text" as const, text }],
				},
			],
		},
	};
}

/**
 * Row drag-and-drop (`@atlaskit/pragmatic-drag-and-drop/element/adapter`)
 * uses native HTML5 drag events, which Playwright's mouse-based
 * `locator.dragTo()` isn't guaranteed to trigger. Dispatching synthetic
 * `DragEvent`s with a real `DataTransfer` directly is the standard
 * headless-testing workaround — the adapter's listeners don't check
 * `event.isTrusted`. Mirrors `e2e-perf/support/motion-metrics.ts`'s
 * `nativeRowDragAndDrop`, dropping near the *top* of the target row so the
 * hitbox resolves a "reorder above" instruction rather than "make child".
 */
async function dragRowBefore(
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
			fire(targetEl, "drop", x, y);
			fire(sourceEl, "dragend", x, y);
		},
		[sourceSelector, targetSelector],
	);
}

test("dragging a row above its sibling reorders them, in the UI and once persisted", async ({
	page,
	orpcClient,
}) => {
	const uniqueSuffix = Date.now().toString();
	const root = await orpcClient.nodes.create({ parentId: null });

	try {
		await orpcClient.nodes.updateContent({
			id: root.id,
			content: lexicalContent(`Drag root ${uniqueSuffix}`),
		});
		await orpcClient.nodes.toggleExpanded({ id: root.id, expanded: true });

		const first = await orpcClient.nodes.create({ parentId: root.id });
		await orpcClient.nodes.updateContent({
			id: first.id,
			content: lexicalContent(`Drag first ${uniqueSuffix}`),
		});
		const second = await orpcClient.nodes.create({
			parentId: root.id,
			afterId: first.id,
		});
		await orpcClient.nodes.updateContent({
			id: second.id,
			content: lexicalContent(`Drag second ${uniqueSuffix}`),
		});

		const rootSlug = toNodeSlug({
			id: root.id,
			content: lexicalContent(`Drag root ${uniqueSuffix}`),
		});
		await page.goto(`/${rootSlug}`);

		const order = () =>
			page
				.locator("[data-node-id]")
				.evaluateAll((rows) =>
					rows.map((row) => row.getAttribute("data-node-id")),
				);
		await expect.poll(order).toEqual([first.id, second.id]);

		// Drag the second row above the first.
		await dragRowBefore(page, second.id, first.id);

		await expect.poll(order).toEqual([second.id, first.id]);
		await expect
			.poll(async () => {
				const { rows } = await orpcClient.nodes.visibleTree();
				return buildVisibleTree(rows, root.id, { includeCollapsed: true }).map(
					(r) => r.id,
				);
			})
			.toEqual([second.id, first.id]);
	} finally {
		await orpcClient.nodes.delete({ id: root.id });
	}
});
