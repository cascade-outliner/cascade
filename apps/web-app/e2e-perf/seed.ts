import { parseArgs } from "node:util";
import { user } from "@cascade/auth/schema";
import { faker } from "@faker-js/faker";
import { eq } from "drizzle-orm";
import { cliArgs } from "./support/cli-args";
import { config } from "./support/config";
import { auth } from "@/features/auth/server/auth";
import { nodes } from "@/features/nodes/server/persistence/node-tables";
import { db } from "@/db";
import {
	assertNotProduction,
	buildTree,
	expectedNodeCount,
	insertRows,
	type TreeShapeConfig,
} from "@/db/seed-tree";

type Shape = "wide" | "deep" | "balanced";

const { values } = parseArgs({
	args: cliArgs(),
	options: {
		count: { type: "string", default: "20000" },
		shape: { type: "string", default: "balanced" },
		email: { type: "string", default: config.perfUserEmail },
		seed: { type: "string", default: "42" },
	},
});

const count = Number.parseInt(values.count, 10);
if (!Number.isFinite(count) || count <= 0) {
	console.error(`--count must be a positive integer, got ${values.count}`);
	process.exit(1);
}
const seed = Number.parseInt(values.seed, 10);
if (!Number.isFinite(seed)) {
	console.error(`--seed must be an integer, got ${values.seed}`);
	process.exit(1);
}
if (values.shape !== "wide" && values.shape !== "deep" && values.shape !== "balanced") {
	console.error(`--shape must be one of wide, deep, balanced; got ${values.shape}`);
	process.exit(1);
}
const shape = values.shape as Shape;
const email = values.email;

function shapeConfig(shape: Shape, count: number): TreeShapeConfig {
	switch (shape) {
		case "wide":
			return {
				roots: 1,
				maxDepth: 2,
				minChildren: count,
				maxChildren: count,
				expandNonLeaf: true,
			};
		case "deep":
			return {
				roots: 1,
				maxDepth: count,
				minChildren: 1,
				maxChildren: 1,
				expandNonLeaf: true,
			};
		case "balanced": {
			const maxDepth = 6;
			const minChildren = 1;
			const maxChildren = 12;
			const avgBranching = (minChildren + maxChildren) / 2;
			let perRoot = 0;
			for (let d = 0; d < maxDepth; d++) perRoot += avgBranching ** d;
			const roots = Math.max(1, Math.round(count / perRoot));
			return { roots, maxDepth, minChildren, maxChildren, expandNonLeaf: true };
		}
	}
}

async function ensurePerfUser(email: string): Promise<string> {
	const existing = await db.select({ id: user.id }).from(user).where(eq(user.email, email));
	if (existing.length > 0) return existing[0].id;

	await auth.api.signUpEmail({
		body: { email, password: config.perfUserPassword, name: config.perfUserName },
	});
	const [created] = await db.select({ id: user.id }).from(user).where(eq(user.email, email));
	return created.id;
}

async function main() {
	assertNotProduction();

	const userId = await ensurePerfUser(email);
	await db.delete(nodes).where(eq(nodes.userId, userId));

	faker.seed(seed);
	const treeConfig = shapeConfig(shape, count);
	const expected = expectedNodeCount(treeConfig);
	console.log(
		`Seeding a "${shape}" tree (seed=${seed}), expecting ~${expected} nodes for ${email}...`,
	);

	const done = await insertRows(
		(rows) => db.insert(nodes).values(rows),
		buildTree(treeConfig, userId),
		expected,
		({ done, expected, rate, etaSeconds }) => {
			console.log(
				`inserted: ${done}/~${expected} (${rate.toFixed(0)}/s, eta ${etaSeconds.toFixed(0)}s)`,
			);
		},
	);

	console.log(`Seeded ${done} nodes for ${email} (shape=${shape}).`);
	process.exit(0);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
