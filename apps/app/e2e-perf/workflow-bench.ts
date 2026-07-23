import { parseArgs } from "node:util";
import { textToLexicalContent } from "@/db/seed-tree";
import { cliArgs } from "./support/cli-args";
import { createPerfClient, type PerfOrpcClient } from "./support/http-client";
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
		warmup: { type: "string", default: "2" },
	},
});

const iterations = Number.parseInt(values.iterations, 10);
const warmup = Number.parseInt(values.warmup, 10);

/**
 * One pass through most of what a node supports — create, edit content,
 * retype, due date, tags, expand/collapse, move, duplicate, read ancestors,
 * re-query the visible tree, then delete — timed as a single end-to-end
 * unit. perf:query/perf:mutate/perf:filter already isolate individual
 * procedures; this exists to catch regressions in the combined path a real
 * editing session actually takes (see #425).
 */
async function runWorkflow(
	client: PerfOrpcClient,
	parentA: string,
	parentB: string,
): Promise<void> {
	const created = await client.nodes.create({ parentId: parentA, afterId: null });
	await client.nodes.updateContent({
		id: created.id,
		content: textToLexicalContent("perf workflow node"),
	});
	await client.nodes.setType({ id: created.id, type: "task", metadata: { completed: false } });
	await client.nodes.setDueDate({ id: created.id, dueDate: "2026-12-31" });
	await client.nodes.setTags({ id: created.id, tags: ["perf", "workflow"] });
	await client.nodes.toggleExpanded({ id: created.id, expanded: false });
	await client.nodes.move({ id: created.id, parentId: parentB, position: "append" });
	const duplicate = await client.nodes.duplicate({ id: created.id });
	await client.nodes.ancestors({ id: duplicate.id });
	await client.nodes.visibleTree({
		rootId: parentB,
		cursor: null,
		includeCollapsedDescendants: true,
		limit: 50,
	});
	await client.nodes.delete({ id: duplicate.id });
	await client.nodes.delete({ id: created.id });
}

async function main() {
	const client = await createPerfClient();

	console.log("Setting up scratch parents...");
	const parentA = await client.nodes.create({ parentId: null, afterId: null });
	const parentB = await client.nodes.create({ parentId: null, afterId: null });

	try {
		if (warmup > 0) {
			console.log(`Warming up with ${warmup} untimed workflow pass(es)...`);
			for (let i = 0; i < warmup; i++) {
				await runWorkflow(client, parentA.id, parentB.id);
			}
		}

		console.log(`Running ${iterations} timed workflow pass(es)...`);
		const samples: LatencySample[] = [];
		for (let i = 0; i < iterations; i++) {
			const outcome = await time(() => runWorkflow(client, parentA.id, parentB.id));
			samples.push({ ok: outcome.ok, ms: outcome.ms });
			if (!outcome.ok) console.error(`workflow ${i} failed:`, outcome.error);
		}

		const summary = summarize(samples);
		printSummary("fullWorkflow", summary);

		const outPath = await writeResultsFile("workflow-bench.json", {
			timestamp: new Date().toISOString(),
			params: { iterations, warmup },
			fullWorkflow: summary,
		});
		console.log(`Wrote results to ${outPath}`);
	} finally {
		console.log("Cleaning up scratch parents...");
		await client.nodes.delete({ id: parentA.id });
		await client.nodes.delete({ id: parentB.id });
	}
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
