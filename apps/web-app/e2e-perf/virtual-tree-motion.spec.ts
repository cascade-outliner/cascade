import { expect, type Page, test } from "@playwright/test";
import { toNodeSlug } from "@/features/nodes/model/node-slug";
import { createPerfClient, type PerfOrpcClient } from "./support/http-client";
import {
	type ActionMeasurement,
	measureAction,
	mountedRowCount,
	nativeRowDragAndDrop,
} from "./support/motion-metrics";
import { writeResultsFile } from "./support/stats";

/**
 * Playwright perf gate for issue #509: proves the candidate single-row WAAPI
 * reposition effect (`animateRowReposition`, gated by
 * `isRowMotionEnabled()`/`window.__CASCADE_ROW_MOTION__`, see
 * `packages/outliner/src/tree/components/virtual-tree-row.tsx`) doesn't
 * regress drag/reorder, create/delete, or expand/collapse reconciliation in
 * the virtualized tree, before any of #507's motion children are allowed to
 * ship. Requires the app server already running (same as the other
 * `e2e-perf/*.ts` scripts) *and* `perf:seed:app --count=20000` already run
 * against the shared perf-harness user, so this spec's scratch subtree lives
 * inside the full seeded tree rather than a synthetic small one.
 */

const CHILD_COUNT = 24;
// Generous bound: only a small viewport slice plus overscan should ever be
// mounted, regardless of the 20,000-node tree it's embedded in.
const MOUNTED_ROW_BOUND = 150;

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

interface ScratchSubtree {
	rootId: string;
	rootTitle: string;
	rootContent: ReturnType<typeof lexicalContent>;
	childIds: string[];
}

/** Builds a root-level scratch node (with `CHILD_COUNT` leaf children) as
 * part of the seeded account tree, so it's subject to the same
 * virtualization as every other row. */
async function seedScratchSubtree(
	client: PerfOrpcClient,
	label: string,
): Promise<ScratchSubtree> {
	const rootTitle = `Motion perf scratch (${label}) ${Date.now()}`;
	const rootContent = lexicalContent(rootTitle);
	const root = await client.nodes.create({ parentId: null, afterId: null });
	await client.nodes.updateContent({ id: root.id, content: rootContent });
	await client.nodes.toggleExpanded({ id: root.id, expanded: true });

	const childIds: string[] = [];
	let afterId: string | null = null;
	for (let i = 0; i < CHILD_COUNT; i++) {
		const child = await client.nodes.create({ parentId: root.id, afterId });
		await client.nodes.updateContent({
			id: child.id,
			content: lexicalContent(`Motion row ${label} ${i}`),
		});
		childIds.push(child.id);
		afterId = child.id;
	}
	return { rootId: root.id, rootTitle, rootContent, childIds };
}

interface MotionMode {
	rowMotion: boolean;
	reducedMotion: boolean;
}

/** Navigates to a scratch subtree's own node-detail page (not the account
 * root) so `visibleTree` cursor-pages just this subtree quickly, while the
 * subtree itself still lives inside the 20,000-node seeded tree for
 * mounted-row-count purposes. */
async function openScratchSubtree(
	page: Page,
	scratch: ScratchSubtree,
	{ rowMotion, reducedMotion }: MotionMode,
): Promise<void> {
	await page.emulateMedia({
		reducedMotion: reducedMotion ? "reduce" : "no-preference",
	});
	if (rowMotion) {
		await page.addInitScript(() => {
			(
				window as unknown as { __CASCADE_ROW_MOTION__?: boolean }
			).__CASCADE_ROW_MOTION__ = true;
		});
	}
	const slug = toNodeSlug({ id: scratch.rootId, content: scratch.rootContent });
	await page.goto(`/${slug}`);
	await expect(page.getByRole("tree")).toBeVisible();
}

function modeKey({ rowMotion, reducedMotion }: MotionMode): string {
	return `rowMotion=${rowMotion} reducedMotion=${reducedMotion}`;
}

test.describe("virtual tree motion (issue #509 perf gate)", () => {
	test.setTimeout(120_000);

	let client: PerfOrpcClient;
	let toggleScratch: ScratchSubtree;
	let createScratch: ScratchSubtree;
	let deleteScratch: ScratchSubtree;
	let dragScratch: ScratchSubtree;
	// biome-ignore lint/suspicious/noExplicitAny: heterogeneous per-action measurement summaries, only ever JSON.stringified
	const results: Record<string, any> = {};

	test.beforeAll(async () => {
		client = await createPerfClient();
		[toggleScratch, createScratch, deleteScratch, dragScratch] =
			await Promise.all([
				seedScratchSubtree(client, "toggle"),
				seedScratchSubtree(client, "create"),
				seedScratchSubtree(client, "delete"),
				seedScratchSubtree(client, "drag"),
			]);
	});

	test.afterAll(async () => {
		await Promise.all(
			[toggleScratch, createScratch, deleteScratch, dragScratch].map(
				(scratch) => client.nodes.delete({ id: scratch.rootId }),
			),
		);
		const outPath = await writeResultsFile("motion-bench.json", {
			timestamp: new Date().toISOString(),
			childCount: CHILD_COUNT,
			mountedRowBound: MOUNTED_ROW_BOUND,
			results,
		});
		console.log(`Wrote motion perf results to ${outPath}`);
	});

	function record(action: string, mode: MotionMode, data: unknown) {
		results[`${action} ${modeKey(mode)}`] = data;
	}

	for (const rowMotion of [false, true]) {
		const mode: MotionMode = { rowMotion, reducedMotion: false };

		test(`toggle expand/collapse (${modeKey(mode)})`, async ({ page }) => {
			await openScratchSubtree(page, toggleScratch, mode);
			const before = await mountedRowCount(page);
			const toggle = page.locator(
				`[data-node-id="${toggleScratch.rootId}"] button[aria-label="Collapse"]`,
			);

			const collapse = await measureAction(page, () => toggle.click());
			const afterCollapse = await mountedRowCount(page);

			const expandToggle = page.locator(
				`[data-node-id="${toggleScratch.rootId}"] button[aria-label="Expand"]`,
			);
			const expand = await measureAction(page, () => expandToggle.click());
			const afterExpand = await mountedRowCount(page);

			expect(before).toBeLessThan(MOUNTED_ROW_BOUND);
			expect(afterCollapse).toBeLessThan(MOUNTED_ROW_BOUND);
			expect(afterExpand).toBeLessThan(MOUNTED_ROW_BOUND);
			record("toggle", mode, {
				mountedBefore: before,
				collapse: summarizeMeasurement(collapse),
				mountedAfterCollapse: afterCollapse,
				expand: summarizeMeasurement(expand),
				mountedAfterExpand: afterExpand,
			});
		});

		test(`create below (${modeKey(mode)})`, async ({ page }) => {
			await openScratchSubtree(page, createScratch, mode);
			const anchorId = createScratch.childIds[2];
			const before = await mountedRowCount(page);

			const editTarget = page.locator(
				`[data-node-id="${anchorId}"] [aria-label="Edit node text"]`,
			);
			await editTarget.click();

			const measurement = await measureAction(page, async () => {
				await page.keyboard.press("Enter");
				await expect
					.poll(() => mountedRowCount(page))
					.toBeGreaterThan(before);
			});
			const after = await mountedRowCount(page);

			expect(before).toBeLessThan(MOUNTED_ROW_BOUND);
			expect(after).toBeLessThan(MOUNTED_ROW_BOUND);
			record("create", mode, {
				...summarizeMeasurement(measurement),
				mountedBefore: before,
				mountedAfter: after,
			});

			// Clean up the created sibling so the next mode's run starts from
			// the same CHILD_COUNT-sized subtree.
			const rows = await client.nodes.visibleTree({
				rootId: createScratch.rootId,
				cursor: null,
				includeCollapsedDescendants: true,
				limit: CHILD_COUNT + 5,
			});
			const extra = rows.rows.find(
				(row) => !createScratch.childIds.includes(row.id),
			);
			if (extra) await client.nodes.delete({ id: extra.id });
		});

		test(`delete row (${modeKey(mode)})`, async ({ page }) => {
			// A throwaway child, created just for this run, so the timed delete
			// always removes something and the subtree's shape resets after.
			const scratchChild = await client.nodes.create({
				parentId: deleteScratch.rootId,
				afterId: deleteScratch.childIds[0],
			});
			await client.nodes.updateContent({
				id: scratchChild.id,
				content: lexicalContent("Motion row delete throwaway"),
			});

			await openScratchSubtree(page, deleteScratch, mode);
			const before = await mountedRowCount(page);

			const row = page.locator(`[data-node-id="${scratchChild.id}"]`);
			await row.click({ button: "right" });
			const deleteItem = page.getByRole("menuitem", { name: "Delete" });

			const measurement = await measureAction(page, async () => {
				await deleteItem.click();
				await expect(row).toHaveCount(0);
			});
			const after = await mountedRowCount(page);

			expect(before).toBeLessThan(MOUNTED_ROW_BOUND);
			expect(after).toBeLessThan(MOUNTED_ROW_BOUND);
			record("delete", mode, {
				...summarizeMeasurement(measurement),
				mountedBefore: before,
				mountedAfter: after,
			});
		});

		test(`drag reorder (${modeKey(mode)})`, async ({ page }) => {
			await openScratchSubtree(page, dragScratch, mode);
			const before = await mountedRowCount(page);

			const [firstId, secondId] = dragScratch.childIds;
			const handleSelector = `[data-node-id="${firstId}"] button[aria-label="Drag to reorder"]`;
			const targetSelector = `[data-node-id="${secondId}"]`;

			const measurement = await measureAction(page, () =>
				nativeRowDragAndDrop(page, handleSelector, targetSelector),
			);
			const after = await mountedRowCount(page);

			expect(before).toBeLessThan(MOUNTED_ROW_BOUND);
			expect(after).toBeLessThan(MOUNTED_ROW_BOUND);
			record("drag", mode, {
				...summarizeMeasurement(measurement),
				mountedBefore: before,
				mountedAfter: after,
			});

			// Best-effort restore to the original sibling order for the next
			// mode's run (the dragged handle belongs to `firstId`, so it's
			// `firstId` that moved); a failure here doesn't invalidate the
			// measurement above, so it isn't asserted on.
			await client.nodes
				.move({
					id: firstId,
					parentId: dragScratch.rootId,
					position: "before",
					targetId: secondId,
				})
				.catch(() => {});
		});
	}

	test("reduced motion suppresses the candidate effect even when enabled", async ({
		page,
	}) => {
		const mode: MotionMode = { rowMotion: true, reducedMotion: true };
		await openScratchSubtree(page, toggleScratch, mode);
		const before = await mountedRowCount(page);
		const toggle = page.locator(
			`[data-node-id="${toggleScratch.rootId}"] button[aria-label="Collapse"]`,
		);
		const collapse = await measureAction(page, () => toggle.click());
		const expandToggle = page.locator(
			`[data-node-id="${toggleScratch.rootId}"] button[aria-label="Expand"]`,
		);
		const expand = await measureAction(page, () => expandToggle.click());
		const after = await mountedRowCount(page);

		expect(before).toBeLessThan(MOUNTED_ROW_BOUND);
		expect(after).toBeLessThan(MOUNTED_ROW_BOUND);
		record("toggle", mode, {
			collapse: summarizeMeasurement(collapse),
			expand: summarizeMeasurement(expand),
		});
	});
});

function summarizeMeasurement(measurement: ActionMeasurement<unknown>) {
	return {
		actionMs: measurement.actionMs,
		frameCount: measurement.frames.frameCount,
		maxFrameGapMs: measurement.frames.maxGapMs,
		longFrames: measurement.frames.longFrames,
	};
}
