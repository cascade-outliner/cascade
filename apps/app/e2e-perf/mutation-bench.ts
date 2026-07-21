import { parseArgs } from "node:util";
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
		creates: { type: "string", default: "50" },
		moves: { type: "string", default: "50" },
		duplicates: { type: "string", default: "10" },
		duplicateSubtreeSize: { type: "string", default: "20" },
		warmup: { type: "string", default: "3" },
	},
});

const creates = Number.parseInt(values.creates, 10);
const moves = Number.parseInt(values.moves, 10);
const duplicates = Number.parseInt(values.duplicates, 10);
const duplicateSubtreeSize = Number.parseInt(values.duplicateSubtreeSize, 10);
const warmup = Number.parseInt(values.warmup, 10);

/**
 * Benchmarks `createNode` and `moveNode` against two scratch parent nodes
 * created just for this run, rather than the seeded tree from `seed.ts` —
 * so results are independent of `--shape`/`--count` and repeated runs don't
 * drift the seeded tree's size or structure out from under `query-bench.ts`.
 * Both scratch parents (and everything created under them) are deleted at
 * the end via `deleteNode`'s cascade.
 */
async function benchCreate(
	client: PerfOrpcClient,
	parentId: string,
): Promise<{ samples: LatencySample[]; createdIds: string[] }> {
	const samples: LatencySample[] = [];
	const createdIds: string[] = [];
	for (let i = 0; i < creates; i++) {
		const outcome = await time(() => client.nodes.create({ parentId, afterId: null }));
		samples.push({ ok: outcome.ok, ms: outcome.ms });
		if (outcome.ok) createdIds.push(outcome.result.id);
		else console.error(`create ${i} failed:`, outcome.error);
	}
	return { samples, createdIds };
}

/** Moves a single scratch node back and forth between two parents. */
async function benchMove(
	client: PerfOrpcClient,
	movedId: string,
	parentA: string,
	parentB: string,
): Promise<LatencySample[]> {
	const samples: LatencySample[] = [];
	for (let i = 0; i < moves; i++) {
		const parentId = i % 2 === 0 ? parentB : parentA;
		const outcome = await time(() =>
			client.nodes.move({ id: movedId, parentId, position: "append" }),
		);
		samples.push({ ok: outcome.ok, ms: outcome.ms });
		if (!outcome.ok) console.error(`move ${i} failed:`, outcome.error);
	}
	return samples;
}

/** A flat template subtree (one parent, `size` children) to repeatedly duplicate. */
async function buildDuplicateTemplate(
	client: PerfOrpcClient,
	parentId: string,
	size: number,
): Promise<string> {
	const template = await client.nodes.create({ parentId, afterId: null });
	for (let i = 0; i < size; i++) {
		await client.nodes.create({ parentId: template.id, afterId: null });
	}
	return template.id;
}

/**
 * Repeatedly duplicates the same template subtree, so every sample copies the
 * same `duplicateSubtreeSize` node count — each call leaves its copy in place
 * (cleaned up with the scratch parent at the end) rather than deleting it
 * immediately, matching how a user duplicating a branch several times over
 * would actually grow the tree.
 */
async function benchDuplicate(
	client: PerfOrpcClient,
	templateId: string,
): Promise<LatencySample[]> {
	const samples: LatencySample[] = [];
	for (let i = 0; i < duplicates; i++) {
		const outcome = await time(() => client.nodes.duplicate({ id: templateId }));
		samples.push({ ok: outcome.ok, ms: outcome.ms });
		if (!outcome.ok) console.error(`duplicate ${i} failed:`, outcome.error);
	}
	return samples;
}

async function main() {
	const client = await createPerfClient();

	console.log("Setting up scratch parents...");
	const parentA = await client.nodes.create({ parentId: null, afterId: null });
	const parentB = await client.nodes.create({ parentId: null, afterId: null });
	const parentC = await client.nodes.create({ parentId: null, afterId: null });
	const movedSeed = await client.nodes.create({ parentId: parentA.id, afterId: null });

	try {
		console.log(
			`Building a ${duplicateSubtreeSize}-node template subtree for duplicate benchmarking...`,
		);
		const templateId = await buildDuplicateTemplate(
			client,
			parentC.id,
			duplicateSubtreeSize,
		);

		if (warmup > 0) {
			console.log(`Warming up with ${warmup} untimed create+move call(s)...`);
			for (let i = 0; i < warmup; i++) {
				const warm = await client.nodes.create({ parentId: parentA.id, afterId: null });
				await client.nodes.move({ id: warm.id, parentId: parentB.id, position: "append" });
				await client.nodes.delete({ id: warm.id });
			}
		}

		console.log(`Running ${creates} timed create(s)...`);
		const { samples: createSamples, createdIds } = await benchCreate(client, parentA.id);

		console.log(`Running ${moves} timed move(s)...`);
		const moveSamples = await benchMove(client, movedSeed.id, parentA.id, parentB.id);

		console.log(
			`Running ${duplicates} timed duplicate(s) of a ${duplicateSubtreeSize}-node subtree...`,
		);
		const duplicateSamples = await benchDuplicate(client, templateId);

		const createSummary = summarize(createSamples);
		const moveSummary = summarize(moveSamples);
		const duplicateSummary = summarize(duplicateSamples);
		printSummary("createNode", createSummary);
		printSummary("moveNode", moveSummary);
		printSummary("duplicateNode", duplicateSummary);

		const outPath = await writeResultsFile("mutation-bench.json", {
			timestamp: new Date().toISOString(),
			params: { creates, moves, duplicates, duplicateSubtreeSize, warmup },
			createNode: createSummary,
			moveNode: moveSummary,
			duplicateNode: duplicateSummary,
		});
		console.log(`Wrote results to ${outPath}`);
		console.log(`(created ${createdIds.length} scratch node(s) during the create benchmark)`);
	} finally {
		console.log("Cleaning up scratch parents...");
		await client.nodes.delete({ id: parentA.id });
		await client.nodes.delete({ id: parentB.id });
		await client.nodes.delete({ id: parentC.id });
	}
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
