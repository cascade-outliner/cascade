import { bench, describe } from "vitest";
import { MemoryPersistence } from "../persistence/memory.ts";
import { generateOutline } from "./fixtures.ts";
import { OutlineStore } from "./store.ts";

for (const size of [1_000, 10_000, 100_000]) {
	const persistence = new MemoryPersistence();
	for (const node of generateOutline(size)) {
		persistence.nodes.set(node.id, node);
	}
	const store = new OutlineStore(persistence);
	await store.ready;

	describe(`${size} nodes`, () => {
		bench("rows()", () => {
			store.rows();
		});
	});
}
