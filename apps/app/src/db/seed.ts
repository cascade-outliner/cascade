import { randomUUID } from "node:crypto";
import { createInterface } from "node:readline/promises";
import { user } from "@cascade/auth/schema";
import { faker } from "@faker-js/faker";
import { eq } from "drizzle-orm";
import { generateNKeysBetween } from "fractional-indexing";
import { auth } from "@/auth";
import { nodes } from "@/core/nodes/node.schema";
import { db } from "@/db";

// This seed-user can only be used in a local environment, and will be deleted and recreated each time the seed script is run.
// The password being visible is intentional to make development easy and have a predictable user available.
const DEV_USER = {
	email: "dev@cascadelist.com",
	password: "password1234",
	name: "Dev User",
};

function assertNotProduction(): void {
	if (process.env.NODE_ENV === "production") {
		console.error(
			"Refusing to run the seed script with NODE_ENV=production. " +
				"This script creates a known dev account and deletes its existing data.",
		);
		process.exit(1);
	}
}

async function ensureDevUser(): Promise<{ id: string; created: boolean }> {
	const existing = await db
		.select({ id: user.id })
		.from(user)
		.where(eq(user.email, DEV_USER.email));
	if (existing.length > 0) return { id: existing[0].id, created: false };

	await auth.api.signUpEmail({ body: DEV_USER });
	const [created] = await db
		.select({ id: user.id })
		.from(user)
		.where(eq(user.email, DEV_USER.email));
	return { id: created.id, created: true };
}

const config = {
	roots: 25, // number of root nodes
	maxDepth: 6, // max nesting depth
	maxChildren: 12, // max children per node
};

async function promptConfig() {
	if (!process.stdin.isTTY) return;
	const rl = createInterface({ input: process.stdin, output: process.stdout });
	for (const key of Object.keys(config) as Array<keyof typeof config>) {
		const answer = await rl.question(`${key} [${config[key]}]: `);
		const n = Number.parseInt(answer, 10);
		if (Number.isFinite(n) && n > 0) config[key] = n;
	}
	rl.close();
}

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

const BATCH_SIZE = 5000; // postgres bind-param limit is ~65535; 5 cols * 5000 = well under it

type Row = {
	id: string;
	parentId: string | null;
	userId: string;
	content: ReturnType<typeof textToLexicalContent>;
	order: string;
};

function buildRow(parentId: string | null, order: string, userId: string): Row {
	const text = faker.lorem.sentences({ min: 1, max: 2 });
	return {
		id: randomUUID(),
		parentId,
		userId,
		content: textToLexicalContent(text),
		order,
	};
}

// Yields rows lazily (BFS over the tree) instead of collecting them all in
// memory, since holding millions of nodes at once OOMs the process.
function* buildTree(userId: string): Generator<Row> {
	const rootOrders = generateNKeysBetween(null, null, config.roots);
	const queue: Array<{ parentId: string; depth: number }> = [];

	for (let i = 0; i < config.roots; i++) {
		const row = buildRow(null, rootOrders[i], userId);
		yield row;
		queue.push({ parentId: row.id, depth: config.maxDepth - 1 });
	}

	while (queue.length > 0) {
		// biome-ignore lint/style/noNonNullAssertion: for cleanliness keep this; we know queue.length > 0 so pop() will never return undefined
		const { parentId, depth } = queue.pop()!;
		if (depth <= 0) continue;
		const count = faker.number.int({ min: 1, max: config.maxChildren });
		const orders = generateNKeysBetween(null, null, count);
		for (let i = 0; i < count; i++) {
			const row = buildRow(parentId, orders[i], userId);
			yield row;
			queue.push({ parentId: row.id, depth: depth - 1 });
		}
	}
}

function expectedNodeCount(): number {
	// geometric series: roots * sum(avgBranching^depth for depth in 0..maxDepth-1)
	const avgBranching = (1 + config.maxChildren) / 2;
	let perRoot = 0;
	for (let d = 0; d < config.maxDepth; d++) perRoot += avgBranching ** d;
	return Math.round(config.roots * perRoot);
}

async function main() {
	assertNotProduction();
	await promptConfig();
	const { id: userId, created } = await ensureDevUser();
	await db.delete(nodes).where(eq(nodes.userId, userId));

	console.log(`expected ~${expectedNodeCount()} nodes`);

	const expected = expectedNodeCount();
	const start = performance.now();
	let buffer: Row[] = [];
	let done = 0;

	for (const row of buildTree(userId)) {
		buffer.push(row);
		if (buffer.length >= BATCH_SIZE) {
			await db.insert(nodes).values(buffer);
			done += buffer.length;
			buffer = [];
			const elapsed = (performance.now() - start) / 1000;
			const rate = done / elapsed;
			const eta = (expected - done) / rate;
			console.log(
				`inserted: ${done}/~${expected} (${rate.toFixed(0)}/s, eta ${eta.toFixed(0)}s)`,
			);
		}
	}
	if (buffer.length > 0) {
		await db.insert(nodes).values(buffer);
		done += buffer.length;
	}

	console.log(`Seeded ${done} nodes.`);
	if (created) {
		console.log(`Sign in as ${DEV_USER.email} / ${DEV_USER.password}`);
	} else {
		console.log(
			`Signed in as existing user ${DEV_USER.email} (password unchanged).`,
		);
	}
	process.exit(0);
}

main()
	.then(() => console.log("Done."))
	.catch((err) => {
		console.error(err);
		process.exit(1);
	});
