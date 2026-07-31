import { parseArgs } from "node:util";
import { cliArgs } from "./support/cli-args";
import { createPerfClient } from "./support/http-client";
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
		iterations: { type: "string", default: "20" },
		warmup: { type: "string", default: "3" },
	},
});

const iterations = Number.parseInt(values.iterations, 10);
const warmup = Number.parseInt(values.warmup, 10);

async function main() {
	const client = await createPerfClient();

	if (warmup > 0) {
		console.log(`Warming up with ${warmup} untimed visibleTree call(s)...`);
		for (let i = 0; i < warmup; i++) {
			await client.nodes.visibleTree();
		}
	}

	console.log(`Timing ${iterations} whole-tree visibleTree call(s)...`);
	const visibleTreeSamples: LatencySample[] = [];

	for (let i = 0; i < iterations; i++) {
		const outcome = await time(() => client.nodes.visibleTree());
		visibleTreeSamples.push({ ok: outcome.ok, ms: outcome.ms });
		if (!outcome.ok) {
			console.error(`visibleTree call ${i} failed:`, outcome.error);
			break;
		}
	}

	const visibleTreeSummary = summarize(visibleTreeSamples);
	printSummary("visibleTree", visibleTreeSummary);

	const outPath = await writeResultsFile("query-bench.json", {
		timestamp: new Date().toISOString(),
		params: { iterations, warmup },
		visibleTree: visibleTreeSummary,
	});
	console.log(`Wrote results to ${outPath}`);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
