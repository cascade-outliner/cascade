import { expect, median, test } from "../fixtures.ts";

const NODES = 10_000;
const RUNS = 5;

// Generous on purpose: these catch step changes, not small drifts. Watch perf-results/ for the trend.
const BUDGET = {
	readyMs: 3_000,
	firstRowMs: 4_000,
	droppedFramesPct: 25,
};

test("10k nodes: load and scroll", async ({
	page,
	seed,
	outlinePage,
	report,
}) => {
	await seed(NODES);

	const runs: {
		readyMs: number;
		firstRowMs: number;
		droppedFramesPct: number;
	}[] = [];
	for (let run = 0; run < RUNS; run++) {
		await page.reload();
		await expect(outlinePage.rows.first()).toBeVisible();

		const load = await page.evaluate(() => {
			const at = (name: string) =>
				performance.getEntriesByName(name)[0]?.startTime ?? Number.NaN;
			return {
				readyMs: at("outline:ready"),
				firstRowMs: at("outline:first-row"),
			};
		});

		// Scroll the window-virtualized list one step per frame; a frame over 1.5× the
		// 60 Hz budget counts as dropped.
		const droppedFramesPct = await page.evaluate(
			() =>
				new Promise<number>((resolve) => {
					const FRAMES = 180;
					let last = performance.now();
					let dropped = 0;
					let frame = 0;
					const step = (now: number) => {
						if (now - last > (1000 / 60) * 1.5) dropped++;
						last = now;
						window.scrollBy(0, 50);
						if (++frame < FRAMES) requestAnimationFrame(step);
						else resolve((dropped / FRAMES) * 100);
					};
					requestAnimationFrame(step);
				}),
		);
		await expect(outlinePage.rows.first()).not.toHaveText("Node 0");

		runs.push({ ...load, droppedFramesPct });
	}

	const metrics = {
		nodes: NODES,
		runs: RUNS,
		readyMs: median(runs.map((r) => r.readyMs)),
		firstRowMs: median(runs.map((r) => r.firstRowMs)),
		droppedFramesPct: median(runs.map((r) => r.droppedFramesPct)),
	};
	await report(metrics);

	expect.soft(metrics.readyMs, "store ready").toBeLessThan(BUDGET.readyMs);
	expect.soft(metrics.firstRowMs, "first row").toBeLessThan(BUDGET.firstRowMs);
	expect
		.soft(metrics.droppedFramesPct, "dropped frames while scrolling")
		.toBeLessThan(BUDGET.droppedFramesPct);
});
