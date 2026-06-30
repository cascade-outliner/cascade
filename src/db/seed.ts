import { randomUUID } from "node:crypto";
import { faker } from "@faker-js/faker";
import { generateNKeysBetween } from "fractional-indexing";
import { nodes } from "#/core/nodes/node.schema";
import { db } from "#/db";

const config = {
	roots: 30, // number of root nodes
	maxDepth: 3, // max nesting depth
	maxChildren: 12, // max children per node
} as const;

async function insertTree(parentId: string | null, depth: number) {
	if (depth <= 0) return;
	const count = faker.number.int({ min: 1, max: config.maxChildren });
	const orders = generateNKeysBetween(null, null, count);
	for (let i = 0; i < count; i++) {
		const id = randomUUID();
		const text = faker.lorem.sentences({ min: 1, max: 3 });
		await db.insert(nodes).values({ id, parentId, text, order: orders[i] });
		console.log(`inserted: ${id} "${text}" (parent: ${parentId ?? "root"})`);
		await insertTree(id, depth - 1);
	}
}

async function main() {
	await db.delete(nodes);
	for (let i = 0; i < config.roots; i++) {
		await insertTree(null, config.maxDepth);
	}
	console.log("Seeded nodes.");
	process.exit(0);
}

main();
