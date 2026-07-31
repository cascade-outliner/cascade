import { expect, test } from "./support/fixtures";

/**
 * Regression test for issue #321: the recursive CTEs backing visibleTree,
 * moveNode's cycle guard, and deleteNode's count all used to stop recursing
 * past depth 64. Deep trees rendered incompletely, and a move whose
 * destination was more than 64 levels below the moved node slipped past the
 * "can't move into own subtree" check and created a cycle. Depth is now
 * unbounded, so this chain (well past the old cap) must be visible in full
 * and the cycle guard must still catch a move at the bottom of it.
 */
const CHAIN_LENGTH = 70;

test("deep trees render past the old 64-level cap and stay cycle-safe", async ({
	orpcClient,
}) => {
	// Sequential creates to build one deep chain push this well past the
	// default per-test timeout.
	test.setTimeout(60_000);
	const root = await orpcClient.nodes.create({ parentId: null });

	try {
		const chainIds: string[] = [];
		let parentId = root.id;
		for (let i = 0; i < CHAIN_LENGTH; i++) {
			const node = await orpcClient.nodes.create({ parentId });
			chainIds.push(node.id);
			parentId = node.id;
		}
		const deepest = chainIds.at(-1);
		if (!deepest) throw new Error("chain was not built");

		const { rows } = await orpcClient.nodes.visibleTree();
		const rowsById = new Map(rows.map((row) => [row.id, row]));

		// Walk the chain by following `parentId`, since the server no longer
		// computes depth-first order itself — that's the client's job now.
		const seen: string[] = [];
		let currentId: string | null = root.id;
		while (currentId !== null) {
			const child = rows.find((row) => row.parentId === currentId);
			if (!child) break;
			seen.push(child.id);
			currentId = child.id;
		}

		expect(seen).toEqual(chainIds);
		expect(rowsById.get(deepest)).toBeDefined();

		await expect(
			orpcClient.nodes.move({
				id: root.id,
				parentId: deepest,
				position: "append",
			}),
		).rejects.toMatchObject({ code: "INVALID_MOVE" });
	} finally {
		await orpcClient.nodes.delete({ id: root.id });
	}
});
