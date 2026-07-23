import { randomUUID } from "node:crypto";
import { faker } from "@faker-js/faker";
import { generateNKeysBetween } from "fractional-indexing";

export function assertNotProduction(): void {
	if (process.env.NODE_ENV === "production") {
		console.error(
			"Refusing to run a seed script with NODE_ENV=production. " +
				"Seed scripts create a known account and delete its existing data.",
		);
		process.exit(1);
	}
}

export type TreeShapeConfig = {
	roots: number;
	maxDepth: number;
	// Children per node are randomized in [minChildren, maxChildren]; set them
	// equal for a deterministic branching factor (used by the perf seed's
	// wide/deep shapes).
	minChildren: number;
	maxChildren: number;
	// Marks every node that will have children as `expanded`, so a client
	// rendering the default (collapsed-respecting) tree view shows the full
	// seeded scale instead of a handful of collapsed roots. Off by default to
	// match the interactive dev seed's existing behavior.
	expandNonLeaf?: boolean;
};

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

export function textToLexicalContent(text: string) {
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

export const BATCH_SIZE = 5000; // postgres bind-param limit is ~65535; 5 cols * 5000 is well under it

export type SeedRow = {
	id: string;
	parentId: string | null;
	userId: string;
	content: ReturnType<typeof textToLexicalContent>;
	order: string;
	expanded: boolean;
};

function buildRow(
	parentId: string | null,
	order: string,
	userId: string,
	expanded: boolean,
): SeedRow {
	const text = faker.lorem.sentences({ min: 1, max: 2 });
	return {
		id: randomUUID(),
		parentId,
		userId,
		content: textToLexicalContent(text),
		order,
		expanded,
	};
}

// Yields rows lazily (BFS over the tree) instead of collecting them all in
// memory, since holding millions of nodes at once OOMs the process.
export function* buildTree(
	config: TreeShapeConfig,
	userId: string,
): Generator<SeedRow> {
	const rootOrders = generateNKeysBetween(null, null, config.roots);
	const queue: Array<{ parentId: string; depth: number }> = [];

	for (let i = 0; i < config.roots; i++) {
		const childDepth = config.maxDepth - 1;
		const row = buildRow(
			null,
			rootOrders[i],
			userId,
			config.expandNonLeaf === true && childDepth > 0,
		);
		yield row;
		queue.push({ parentId: row.id, depth: childDepth });
	}

	while (queue.length > 0) {
		// biome-ignore lint/style/noNonNullAssertion: for cleanliness keep this; we know queue.length > 0 so pop() will never return undefined
		const { parentId, depth } = queue.pop()!;
		if (depth <= 0) continue;
		const count = faker.number.int({
			min: config.minChildren,
			max: config.maxChildren,
		});
		const orders = generateNKeysBetween(null, null, count);
		for (let i = 0; i < count; i++) {
			const childDepth = depth - 1;
			const row = buildRow(
				parentId,
				orders[i],
				userId,
				config.expandNonLeaf === true && childDepth > 0,
			);
			yield row;
			queue.push({ parentId: row.id, depth: childDepth });
		}
	}
}

export function expectedNodeCount(config: TreeShapeConfig): number {
	// geometric series: roots * sum(avgBranching^depth for depth in 0..maxDepth-1)
	const avgBranching = (config.minChildren + config.maxChildren) / 2;
	let perRoot = 0;
	for (let d = 0; d < config.maxDepth; d++) perRoot += avgBranching ** d;
	return Math.round(config.roots * perRoot);
}

export interface InsertProgress {
	done: number;
	expected: number;
	rate: number;
	etaSeconds: number;
}

/**
 * Batches a lazily-generated row stream into `db.insert` calls, reporting
 * progress after each batch so long-running seeds (millions of nodes) don't
 * look hung.
 */
export async function insertRows(
	insertBatch: (rows: SeedRow[]) => Promise<unknown>,
	rows: Generator<SeedRow>,
	expected: number,
	onProgress?: (progress: InsertProgress) => void,
): Promise<number> {
	const start = performance.now();
	let buffer: SeedRow[] = [];
	let done = 0;

	const flush = async () => {
		if (buffer.length === 0) return;
		await insertBatch(buffer);
		done += buffer.length;
		buffer = [];
		const elapsed = (performance.now() - start) / 1000;
		const rate = done / elapsed;
		onProgress?.({
			done,
			expected,
			rate,
			etaSeconds: (expected - done) / rate,
		});
	};

	for (const row of rows) {
		buffer.push(row);
		if (buffer.length >= BATCH_SIZE) await flush();
	}
	await flush();

	return done;
}
