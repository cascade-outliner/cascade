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
		pages: { type: "string", default: "20" },
		limit: { type: "string", default: "500" },
		warmup: { type: "string", default: "3" },
	},
});

const pages = Number.parseInt(values.pages, 10);
const limit = Number.parseInt(values.limit, 10);
const warmup = Number.parseInt(values.warmup, 10);

async function main() {
	const client = await createPerfClient();
	
	if (warmup > 0) {
		console.log(`Warming up with ${warmup} untimed visibleTree call(s)...`);
		for (let i = 0; i < warmup; i++) {
			await client.nodes.visibleTree({
				rootId: null,
				cursor: null,
				includeCollapsedDescendants: true,
				limit,
			});
		}
	}

	console.log(`Walking up to ${pages} visibleTree page(s) at limit=${limit}...`);
	const visibleTreeSamples: LatencySample[] = [];
	let cursor: string[] | null = null;

	for (let page = 0; page < pages; page++) {
		const outcome = await time(() =>
			client.nodes.visibleTree({
				rootId: null,
				cursor,
				includeCollapsedDescendants: true,
				limit,
			}),
		);
		visibleTreeSamples.push({ ok: outcome.ok, ms: outcome.ms });
		if (!outcome.ok) {
			console.error(`visibleTree page ${page} failed:`, outcome.error);
			break;
		}
		const { nextCursor } = outcome.result;
		if (!nextCursor) break;
		cursor = nextCursor;
	}

	const visibleTreeSummary = summarize(visibleTreeSamples);
	printSummary("visibleTree", visibleTreeSummary);

	const outPath = await writeResultsFile("query-bench.json", {
		timestamp: new Date().toISOString(),
		params: { pages, limit, warmup },
		visibleTree: visibleTreeSummary,
	});
	console.log(`Wrote results to ${outPath}`);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
