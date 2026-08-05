import { expect, test } from "@playwright/test";
import type { MutationReconciliationSample } from "@/features/nodes/client/tree/mutations/mutation-reconciliation-perf";
import { toNodeSlug } from "@/features/nodes/model/node-slug";
import { createPerfClient, type PerfOrpcClient } from "./support/http-client";
import { summarize, writeResultsFile } from "./support/stats";

/**
 * Playwright perf spec for issue #597: measures the gap TanStack Query
 * itself sits in for a mutation — server response landing, through the
 * matching query cache write ("reconciliation"), to the next painted frame
 * — independent of the DOM/animation timing `virtual-tree-motion.spec.ts`
 * measures (see CLAUDE.md's "Not yet measured, and why"). Drives the real
 * "create below" flow (Enter after editing a row), the one node mutation
 * that patches its cache only after the server responds (`use-create-node.ts`)
 * rather than optimistically in `onMutate` like every other node mutation,
 * so there's a genuine response-to-store gap to measure.
 * `recordMutationReconciliation` (called from `use-create-node.ts`) is inert
 * unless `window.__CASCADE_MUTATION_TIMING__` is set below, so it costs real
 * users nothing.
 */

const ITERATIONS = 30;

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

interface TimingWindow {
	__CASCADE_MUTATION_TIMING__?: boolean;
	__cascadeMutationTimings?: MutationReconciliationSample[];
}

test.describe("mutation reconciliation (issue #597 perf harness)", () => {
	test.setTimeout(120_000);

	let client: PerfOrpcClient;
	let rootId: string;
	let rootContent: ReturnType<typeof lexicalContent>;
	let firstChildId: string;

	test.beforeAll(async () => {
		client = await createPerfClient();
		const rootTitle = `Reconciliation perf scratch ${Date.now()}`;
		rootContent = lexicalContent(rootTitle);
		const root = await client.nodes.create({ parentId: null, afterId: null });
		await client.nodes.updateContent({ id: root.id, content: rootContent });
		await client.nodes.toggleExpanded({ id: root.id, expanded: true });
		rootId = root.id;

		const first = await client.nodes.create({ parentId: rootId, afterId: null });
		await client.nodes.updateContent({
			id: first.id,
			content: lexicalContent("Reconciliation row 0"),
		});
		firstChildId = first.id;
	});

	test.afterAll(async () => {
		await client.nodes.delete({ id: rootId });
	});

	test(`create-below reconciliation (${ITERATIONS} iterations)`, async ({ page }) => {
		await page.addInitScript(() => {
			(window as unknown as TimingWindow).__CASCADE_MUTATION_TIMING__ = true;
		});

		const slug = toNodeSlug({ id: rootId, content: rootContent });
		await page.goto(`/${slug}`);
		await expect(page.getByRole("tree")).toBeVisible();

		const editTarget = page.locator(
			`[data-node-id="${firstChildId}"] [aria-label="Edit node text"]`,
		);
		await editTarget.click();

		const timingsLength = () =>
			page.evaluate(
				() => (window as unknown as TimingWindow).__cascadeMutationTimings?.length ?? 0,
			);

		for (let i = 0; i < ITERATIONS; i++) {
			const before = await timingsLength();
			await page.keyboard.press("Enter");
			await expect.poll(timingsLength).toBeGreaterThan(before);
		}

		const samples = await page.evaluate(
			() => (window as unknown as TimingWindow).__cascadeMutationTimings ?? [],
		);
		expect(samples.length).toBe(ITERATIONS);

		const toSamples = (values: number[]) => values.map((ms) => ({ ok: true as const, ms }));
		const results = {
			reconciliation: summarize(toSamples(samples.map((s) => s.reconciliationMs))),
			paint: summarize(toSamples(samples.map((s) => s.paintMs))),
			total: summarize(toSamples(samples.map((s) => s.totalMs))),
		};

		const outPath = await writeResultsFile("reconciliation-bench.json", {
			timestamp: new Date().toISOString(),
			iterations: ITERATIONS,
			results,
		});
		console.log(`Wrote reconciliation perf results to ${outPath}`);
	});
});
