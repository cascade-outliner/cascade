import { parseArgs } from "node:util";
import { cliArgs } from "./cli-args";
import { createPerfClient } from "./http-client";
import { type LatencySample, printSummary, summarize, time, writeResultsFile } from "./stats";

const { values } = parseArgs({
	args: cliArgs(),
	options: {
		// Total number of moveNode calls to issue.
		total: { type: "string", default: "200" },
		// How many of those calls are in flight at once, simulating concurrent
		// reorders for the same user — the scenario that contends on moveNode's
		// per-user pg_advisory_xact_lock.
		concurrency: { type: "string", default: "20" },
		// How many distinct nodes to draw targets from (cycled through).
		sample: { type: "string", default: "50" },
	},
});

const total = Number.parseInt(values.total, 10);
const concurrency = Number.parseInt(values.concurrency, 10);
const sampleSize = Number.parseInt(values.sample, 10);

async function main() {
	const client = await createPerfClient();

	const { rows } = await client.nodes.visibleTree({
		rootId: null,
		cursor: null,
		includeCollapsedDescendants: true,
		limit: sampleSize,
	});
	if (rows.length === 0) {
		throw new Error("No nodes found for the perf user — run scripts/perf/seed.ts first.");
	}
	const targets = rows.map((row) => ({ id: row.id, parentId: row.parentId }));

	console.log(
		`Firing ${total} moveNode call(s) at concurrency ${concurrency} across ${targets.length} sampled node(s)...`,
	);

	// Each call moves a node to the end of its own current parent's children:
	// works regardless of tree shape (wide siblings or a deep single-child
	// chain) and always contends on the same per-user advisory lock without
	// needing a distinct move target.
	const samples: LatencySample[] = [];
	const overallStart = performance.now();
	let issued = 0;
	while (issued < total) {
		const batchSize = Math.min(concurrency, total - issued);
		const batch = Array.from({ length: batchSize }, (_, i) => {
			const target = targets[(issued + i) % targets.length];
			return time(() =>
				client.nodes.move({
					id: target.id,
					parentId: target.parentId,
					position: "append",
				}),
			);
		});
		const outcomes = await Promise.all(batch);
		for (const outcome of outcomes) {
			samples.push({ ok: outcome.ok, ms: outcome.ms });
			if (!outcome.ok) console.error("moveNode failed:", outcome.error);
		}
		issued += batchSize;
	}
	const wallClockMs = performance.now() - overallStart;

	const summary = summarize(samples);
	printSummary("moveNode", summary);
	const opsPerSec = (samples.length / wallClockMs) * 1000;
	console.log(
		`throughput: ${opsPerSec.toFixed(1)} ops/s over ${(wallClockMs / 1000).toFixed(1)}s`,
	);

	const outPath = await writeResultsFile("move-bench.json", {
		timestamp: new Date().toISOString(),
		params: { total, concurrency, sample: targets.length },
		moveNode: summary,
		opsPerSec,
		wallClockMs,
	});
	console.log(`Wrote results to ${outPath}`);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
