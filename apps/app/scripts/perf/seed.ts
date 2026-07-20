import { parseArgs } from "node:util";
import { user } from "@cascade/auth/schema";
import { eq } from "drizzle-orm";
import { cliArgs } from "./cli-args";
import { config } from "./config";
import { auth } from "@/auth";
import { nodes } from "@/core/nodes/node.schema";
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
	},
});

const count = Number.parseInt(values.count, 10);
if (!Number.isFinite(count) || count <= 0) {
	console.error(`--count must be a positive integer, got ${values.count}`);
	process.exit(1);
}
if (values.shape !== "wide" && values.shape !== "deep" && values.shape !== "balanced") {
	console.error(`--shape must be one of wide, deep, balanced; got ${values.shape}`);
	process.exit(1);
}
const shape = values.shape as Shape;
const email = values.email;

// The recursive tree-reading queries (visibleTree, getNodeAncestors, moveNode's
// subtree check) all cap recursion at depth 64 as a hard correctness bound —
// see apps/app/src/core/nodes/node.procedures.ts. A "deep" tree longer than
// that isn't a bug in the harness: it deliberately lets us measure the cost of
// walking right up to that cap, and confirms nodes past it are (by design)
// unreachable from an ancestor above the cap.
function shapeConfig(shape: Shape, count: number): TreeShapeConfig {
	// expandNonLeaf: true so the app's default (collapsed-respecting) tree view
	// actually shows the seeded scale, the same way a tree a real user has
	// spent time expanding would look, rather than a handful of collapsed
	// roots with everything folded away underneath.
	switch (shape) {
		case "wide":
			// One root with `count` direct children: stresses the per-row
			// has_children/is_last_child computation at a single tree level.
			return {
				roots: 1,
				maxDepth: 2,
				minChildren: count,
				maxChildren: count,
				expandNonLeaf: true,
			};
		case "deep":
			// A single chain `count` nodes long: stresses ancestor/descendant
			// walks and the depth-64 recursion cap.
			return {
				roots: 1,
				maxDepth: count,
				minChildren: 1,
				maxChildren: 1,
				expandNonLeaf: true,
			};
		case "balanced": {
			// Same branching shape as the interactive dev seed (depth 6, up to
			// 12 children), scaled to land on ~`count` total nodes.
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
	// Perf runs always start from a clean tree for this user so results are
	// comparable run to run.
	await db.delete(nodes).where(eq(nodes.userId, userId));

	const treeConfig = shapeConfig(shape, count);
	const expected = expectedNodeCount(treeConfig);
	console.log(`Seeding a "${shape}" tree, expecting ~${expected} nodes for ${email}...`);

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
