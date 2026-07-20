import { parseArgs } from "node:util";
import { cliArgs } from "./cli-args";
import { createPerfClient } from "./http-client";
import { type LatencySample, printSummary, summarize, time, writeResultsFile } from "./stats";

const { values } = parseArgs({
	args: cliArgs(),
	options: {
		// How many visibleTree pages to walk via cursor pagination, simulating
		// scrolling/loading further down a large tree.
		pages: { type: "string", default: "20" },
		// Page size passed to visibleTree, same default the app itself uses.
		limit: { type: "string", default: "500" },
		// How many times to repeat the getNodeAncestors call per sampled node id.
		ancestorRepeats: { type: "string", default: "3" },
	},
});

const pages = Number.parseInt(values.pages, 10);
const limit = Number.parseInt(values.limit, 10);
const ancestorRepeats = Number.parseInt(values.ancestorRepeats, 10);

async function main() {
	const client = await createPerfClient();

	console.log(`Walking up to ${pages} visibleTree page(s) at limit=${limit}...`);
	const visibleTreeSamples: LatencySample[] = [];
	const sampledNodeIds: string[] = [];
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
		const { rows, nextCursor } = outcome.result;
		// Sample every ~25th row's id so getNodeAncestors below covers a spread
		// of depths/positions rather than just the first few rows of a page.
		for (let i = 0; i < rows.length; i += 25) sampledNodeIds.push(rows[i].id);
		if (!nextCursor) break;
		cursor = nextCursor;
	}

	const visibleTreeSummary = summarize(visibleTreeSamples);
	printSummary("visibleTree", visibleTreeSummary);

	console.log(
		`Calling getNodeAncestors on ${sampledNodeIds.length} sampled node(s), ${ancestorRepeats}x each...`,
	);
	const ancestorSamples: LatencySample[] = [];
	for (const id of sampledNodeIds) {
		for (let i = 0; i < ancestorRepeats; i++) {
			const outcome = await time(() => client.nodes.ancestors({ id }));
			ancestorSamples.push({ ok: outcome.ok, ms: outcome.ms });
			if (!outcome.ok) console.error(`getNodeAncestors(${id}) failed:`, outcome.error);
		}
	}
	const ancestorSummary = summarize(ancestorSamples);
	printSummary("getNodeAncestors", ancestorSummary);

	const outPath = await writeResultsFile("query-bench.json", {
		timestamp: new Date().toISOString(),
		params: { pages, limit, ancestorRepeats },
		visibleTree: visibleTreeSummary,
		getNodeAncestors: ancestorSummary,
	});
	console.log(`Wrote results to ${outPath}`);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
