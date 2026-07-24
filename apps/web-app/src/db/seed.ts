import { createInterface } from "node:readline/promises";
import { auth } from "@cascade/api/auth";
import { db } from "@cascade/api/db";
import { nodes } from "@cascade/api/node-tables";
import { user } from "@cascade/auth/schema";
import { eq } from "drizzle-orm";
import {
	assertNotProduction,
	buildTree,
	expectedNodeCount,
	insertRows,
	type TreeShapeConfig,
} from "@/db/seed-tree";

// This seed-user can only be used in a local environment, and will be deleted and recreated each time the seed script is run.
// The password being visible is intentional to make development easy and have a predictable user available.
const DEV_USER = {
	email: "dev@cascadelist.com",
	password: "password1234",
	name: "Dev User",
};

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

const config: TreeShapeConfig = {
	roots: 25, // number of root nodes
	maxDepth: 6, // max nesting depth
	minChildren: 1,
	maxChildren: 12, // max children per node
};

async function promptConfig() {
	if (!process.stdin.isTTY) return;
	const rl = createInterface({ input: process.stdin, output: process.stdout });
	for (const key of ["roots", "maxDepth", "maxChildren"] as const) {
		const answer = await rl.question(`${key} [${config[key]}]: `);
		const n = Number.parseInt(answer, 10);
		if (Number.isFinite(n) && n > 0) config[key] = n;
	}
	rl.close();
}

async function main() {
	assertNotProduction();
	await promptConfig();
	const { id: userId, created } = await ensureDevUser();
	await db.delete(nodes).where(eq(nodes.userId, userId));

	const expected = expectedNodeCount(config);
	console.log(`expected ~${expected} nodes`);

	const done = await insertRows(
		(rows) => db.insert(nodes).values(rows),
		buildTree(config, userId),
		expected,
		({ done, expected, rate, etaSeconds }) => {
			console.log(
				`inserted: ${done}/~${expected} (${rate.toFixed(0)}/s, eta ${etaSeconds.toFixed(0)}s)`,
			);
		},
	);

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
