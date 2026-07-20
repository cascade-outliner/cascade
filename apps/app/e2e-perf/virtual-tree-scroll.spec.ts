import { expect, test } from "@playwright/test";
import { writeResultsFile } from "./support/stats";

/**
 * Measures the virtualized tree view against whatever tree `e2e-perf/seed.ts`
 * has seeded for the perf-harness user. Not a strict pass/fail perf gate (see
 * CLAUDE.md/issue #304) — the useful signal is the printed/written timings
 * plus the mounted-row assertion, which catches a regression in virtualization
 * itself (e.g. issue #296's O(n) `siblingPosition` scan) rather than a slow
 * frame here or there.
 */
test("virtualized tree renders and scrolls a large tree without unbounded DOM growth", async ({
	page,
}) => {
	const navStart = Date.now();
	await page.goto("/");
	await expect(page.getByRole("tree")).toBeVisible();
	// The virtualizer needs a layout pass (ResizeObserver on the scroll
	// container) before it mounts any rows, so wait for the first one rather
	// than treating the empty gap as "no rows".
	await expect(page.getByRole("treeitem").first()).toBeVisible();
	const timeToTreeMs = Date.now() - navStart;

	const rowCountAtTop = await page.getByRole("treeitem").count();

	const steps = 20;
	const scrollStart = Date.now();
	for (let i = 0; i < steps; i++) {
		await page.mouse.wheel(0, 2000);
		// Give the virtualizer's scroll handler + measureElement a moment to settle.
		await page.waitForTimeout(50);
	}
	const scrollMs = Date.now() - scrollStart;

	const rowCountAfterScroll = await page.getByRole("treeitem").count();

	console.log(`time to tree visible: ${timeToTreeMs}ms`);
	console.log(
		`scrolled ${steps} step(s) in ${scrollMs}ms (${(scrollMs / steps).toFixed(1)}ms/step)`,
	);
	console.log(`mounted rows: top=${rowCountAtTop} afterScroll=${rowCountAfterScroll}`);

	await writeResultsFile("virtual-tree-scroll.json", {
		timestamp: new Date().toISOString(),
		timeToTreeMs,
		scroll: { steps, totalMs: scrollMs, msPerStepMs: scrollMs / steps },
		mountedRows: { atTop: rowCountAtTop, afterScroll: rowCountAfterScroll },
	});

	// However large the seeded tree is, the number of mounted rows should stay
	// small, non-zero, and roughly constant. If this grows with total node
	// count, virtualization itself has regressed.
	expect(rowCountAtTop).toBeGreaterThan(0);
	expect(rowCountAtTop).toBeLessThan(200);
	expect(rowCountAfterScroll).toBeGreaterThan(0);
	expect(rowCountAfterScroll).toBeLessThan(200);
});
