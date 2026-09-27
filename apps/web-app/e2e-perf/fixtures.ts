import { mkdir, writeFile } from "node:fs/promises";
import { generateOutline } from "@cascade/data/fixtures";
import { test as base } from "../e2e/fixtures.ts";

interface Fixtures {
	/** Writes a generated outline of `count` nodes straight into IndexedDB. Reload afterwards to load it. */
	seed: (count: number) => Promise<void>;
	/** Saves `metrics` to `perf-results/<test-title>.json` and attaches them to the report. */
	report: (metrics: Record<string, number>) => Promise<void>;
}

/** 4× is roughly a mid-range phone; `PERF_CPU_THROTTLE=1` to compare against an unthrottled desktop. */
const CPU_THROTTLE = Number(process.env.PERF_CPU_THROTTLE ?? 4);

export const test = base.extend<Fixtures>({
	page: async ({ page }, use) => {
		// Timestamp the first row paint from inside the page, so no polling delay leaks into the number.
		await page.addInitScript(() => {
			new MutationObserver((_, observer) => {
				if (document.querySelector('[data-testid="outliner-row"]')) {
					performance.mark("outline:first-row");
					observer.disconnect();
				}
			}).observe(document, { childList: true, subtree: true });
		});
		const cdp = await page.context().newCDPSession(page);
		await cdp.send("Emulation.setCPUThrottlingRate", { rate: CPU_THROTTLE });
		await use(page);
	},
	seed: async ({ page, outlinePage }, use) => {
		await use(async (count) => {
			// The app creates the database on first load; write into it, then reload to read it back.
			await outlinePage.goto();
			await page.evaluate(
				(nodes) =>
					new Promise<void>((resolve, reject) => {
						const open = indexedDB.open("cascade");
						open.onerror = () => reject(open.error);
						open.onsuccess = () => {
							const db = open.result;
							const tx = db.transaction("nodes", "readwrite");
							for (const node of nodes) {
								tx.objectStore("nodes").put(node);
							}
							tx.oncomplete = () => {
								db.close();
								resolve();
							};
							tx.onerror = () => reject(tx.error);
						};
					}),
				generateOutline(count),
			);
		});
	},
	// biome-ignore lint/correctness/noEmptyPattern: Playwright requires a destructured fixtures argument.
	report: async ({}, use, testInfo) => {
		await use(async (metrics) => {
			const title = testInfo.titlePath.slice(1).join(" › ");
			const body = `${JSON.stringify({ test: title, ...metrics }, null, "\t")}\n`;
			const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
			await mkdir("perf-results", { recursive: true });
			await writeFile(`perf-results/${slug}.json`, body);
			await testInfo.attach("metrics", {
				body,
				contentType: "application/json",
			});
		});
	},
});

export { expect } from "../e2e/fixtures.ts";

export function median(values: number[]): number {
	const sorted = [...values].sort((a, b) => a - b);
	const mid = Math.floor(sorted.length / 2);
	return sorted.length % 2
		? (sorted[mid] as number)
		: ((sorted[mid - 1] as number) + (sorted[mid] as number)) / 2;
}
