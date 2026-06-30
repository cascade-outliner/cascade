import { randomUUID } from "node:crypto";
import { nodes } from "#/core/nodes/node.schema";
import { db } from "#/db";

// A few roots with nesting so the tree UI has something to expand.
const tree = {
	Groceries: {
		Produce: { Apples: {}, Spinach: {} },
		Dairy: { Milk: {}, Cheese: {} },
	},
	Project: {
		Design: { Wireframes: {}, "Color palette": {} },
		Build: { "Set up CI": {}, "Write tests": {} },
	},
	"Reading list": {},
};

type Tree = { [text: string]: Tree };

async function insert(subtree: Tree, parentId: string | null) {
	for (const [text, children] of Object.entries(subtree)) {
		const id = randomUUID();
		await db.insert(nodes).values({ id, parentId, text });
		await insert(children, id);
	}
}

async function main() {
	await db.delete(nodes); // ponytail: dev seed wipes the table; not for prod
	await insert(tree, null);
	console.log("Seeded nodes.");
	process.exit(0);
}

main();
