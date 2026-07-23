import { parseArgs } from "node:util";
import { getRowVisibility } from "@cascade/outliner/filter-visibility";
import { noFilters, type NodeFilters } from "@cascade/outliner/node-filters";
import type { VisibleNodeRow } from "@cascade/outliner/node-types";
import { cliArgs } from "./support/cli-args";
import { buildSyntheticRows, type Shape } from "./support/synthetic-tree";
import {
	type LatencySample,
	printSummary,
	summarize,
	time,
	writeResultsFile,
} from "./support/stats";

const { values } = parseArgs({
	args: cliArgs(),
	options: {
		count: { type: "string", default: "5000" },
		shape: { type: "string", default: "balanced" },
		seed: { type: "string", default: "42" },
		collapsedFraction: { type: "string", default: "0.5" },
		iterations: { type: "string", default: "50" },
		warmup: { type: "string", default: "5" },
	},
});

const count = Number.parseInt(values.count, 10);
if (values.shape !== "wide" && values.shape !== "deep" && values.shape !== "balanced") {
	console.error(`--shape must be one of wide, deep, balanced; got ${values.shape}`);
	process.exit(1);
}
const shape = values.shape as Shape;
const seed = Number.parseInt(values.seed, 10);
const collapsedFraction = Number.parseFloat(values.collapsedFraction);
const iterations = Number.parseInt(values.iterations, 10);
const warmup = Number.parseInt(values.warmup, 10);

/**
 * getRowVisibility is synchronous; `time` (async, shared with the HTTP-based
 * scripts) just wraps it so this reuses the same LatencySample/summarize
 * machinery as query-bench.ts and mutation-bench.ts.
 */
async function benchFilter(
	rows: VisibleNodeRow[],
	filters: NodeFilters,
): Promise<LatencySample[]> {
	const samples: LatencySample[] = [];
	for (let i = 0; i < iterations; i++) {
		const outcome = await time(() => Promise.resolve(getRowVisibility(rows, filters)));
		samples.push({ ok: outcome.ok, ms: outcome.ms });
	}
	return samples;
}

/**
 * Benchmarks getRowVisibility (packages/outliner/src/virtual-tree/filter-visibility.ts)
 * directly against a synthetic tree, instead of over HTTP like query-bench.ts
 * and mutation-bench.ts: filtering (tag/due-date, see #374) is pure
 * client-side logic with no server round trip, so the interesting cost is
 * entirely inside the function itself.
 */
async function main() {
	console.log(
		`Building a synthetic "${shape}" tree (count=${count}, seed=${seed}, ` +
			`collapsedFraction=${collapsedFraction})...`,
	);
	const rows = buildSyntheticRows(shape, count, {
		seed,
		collapsedFraction,
		taggedFraction: 0.1,
		dueTodayFraction: 0.1,
	});
	console.log(`Built ${rows.length} rows.`);

	const tagFilter: NodeFilters = { ...noFilters, tags: ["benchmark"] };
	const dueTodayFilter: NodeFilters = { ...noFilters, dueToday: true };

	if (warmup > 0) {
		console.log(`Warming up with ${warmup} untimed call(s)...`);
		for (let i = 0; i < warmup; i++) {
			getRowVisibility(rows, tagFilter);
			getRowVisibility(rows, dueTodayFilter);
		}
	}

	console.log(`Running ${iterations} timed tag-filter call(s)...`);
	const tagSamples = await benchFilter(rows, tagFilter);

	console.log(`Running ${iterations} timed due-today-filter call(s)...`);
	const dueTodaySamples = await benchFilter(rows, dueTodayFilter);

	const tagSummary = summarize(tagSamples);
	const dueTodaySummary = summarize(dueTodaySamples);
	printSummary("tagFilter", tagSummary);
	printSummary("dueTodayFilter", dueTodaySummary);

	const outPath = await writeResultsFile("filter-bench.json", {
		timestamp: new Date().toISOString(),
		params: { count, shape, seed, collapsedFraction, iterations, warmup, rows: rows.length },
		tagFilter: tagSummary,
		dueTodayFilter: dueTodaySummary,
	});
	console.log(`Wrote results to ${outPath}`);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
