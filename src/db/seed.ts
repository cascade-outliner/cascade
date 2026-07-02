import { randomUUID } from "node:crypto";
import { faker } from "@faker-js/faker";
import { generateNKeysBetween } from "fractional-indexing";
import { nodes } from "#/core/nodes/node.schema";
import { db } from "#/db";

const config = {
	roots: 1000, // number of root nodes
	maxDepth: 6, // max nesting depth
	maxChildren: 12, // max children per node
} as const;

type LexicalTextNode = {
	detail: number;
	format: number;
	mode: string;
	style: string;
	text: string;
	type: "text";
	version: 1;
};

// format bitmask: 1=bold, 2=italic, 3=bold+italic
function randomFormat(): number {
	return faker.helpers.weightedArrayElement([
		{ value: 0, weight: 5 },
		{ value: 1, weight: 2 },
		{ value: 2, weight: 2 },
		{ value: 3, weight: 1 },
	]);
}

function textToLexicalContent(text: string) {
	// Split into words and randomly apply bold/italic to some spans
	const words = text.split(" ");
	const children: LexicalTextNode[] = [];
	let i = 0;
	while (i < words.length) {
		const format = randomFormat();
		// grab a run of 1-4 words with the same format
		const runLen =
			format === 0
				? faker.number.int({ min: 3, max: 8 })
				: faker.number.int({ min: 1, max: 4 });
		const slice = words.slice(i, i + runLen).join(" ");
		if (children.length > 0 && format !== 0) {
			// add a space before formatted runs
			children.push({
				detail: 0,
				format: 0,
				mode: "normal",
				style: "",
				text: " ",
				type: "text",
				version: 1,
			});
		}
		children.push({
			detail: 0,
			format,
			mode: "normal",
			style: "",
			text:
				children.length === 0 || format === 0
					? children.length === 0
						? slice
						: ` ${slice}`
					: slice,
			type: "text",
			version: 1,
		});
		i += runLen;
	}

	return {
		root: {
			children: [
				{
					children,
					direction: "ltr",
					format: "",
					indent: 0,
					type: "paragraph",
					version: 1,
				},
			],
			direction: "ltr",
			format: "",
			indent: 0,
			type: "root",
			version: 1,
		},
	};
}

let inserted = 0;

async function insertChildren(parentId: string, depth: number) {
	if (depth <= 0) return;
	const count = faker.number.int({ min: 1, max: config.maxChildren });
	const orders = generateNKeysBetween(null, null, count);
	for (let i = 0; i < count; i++) {
		const id = randomUUID();
		const text = faker.lorem.sentences({ min: 1, max: 2 });
		const content = textToLexicalContent(text);
		await db.insert(nodes).values({ id, parentId, content, order: orders[i] });
		process.stdout.write(`\rinserted: ${++inserted}`);
		await insertChildren(id, depth - 1);
	}
}

async function main() {
	await db.delete(nodes);

	// All root nodes are siblings under the same parent (null), so they must
	// share a single order batch rather than each generating its own from scratch.
	const rootOrders = generateNKeysBetween(null, null, config.roots);
	for (let i = 0; i < config.roots; i++) {
		const id = randomUUID();
		const text = faker.lorem.sentences({ min: 1, max: 2 });
		const content = textToLexicalContent(text);
		await db
			.insert(nodes)
			.values({ id, parentId: null, content, order: rootOrders[i] });
		process.stdout.write(`\rinserted: ${++inserted}`);
		await insertChildren(id, config.maxDepth - 1);
	}

	console.log(`\nSeeded ${inserted} nodes.`);
	process.exit(0);
}

main()
	.then(() => console.log("Done."))
	.catch((err) => {
		console.error(err);
		process.exit(1);
	});
