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

		const seen: string[] = [];
		let cursor: string[] | null = null;
		do {
			const page = await orpcClient.nodes.visibleTree({
				rootId: root.id,
				cursor,
				includeCollapsedDescendants: true,
				limit: 500,
			});
			seen.push(...page.rows.map((r) => r.id));
			cursor = page.nextCursor;
		} while (cursor !== null);

		expect(seen).toEqual(chainIds);
		const deepestRow = seen.indexOf(deepest);
		expect(deepestRow).toBe(CHAIN_LENGTH - 1);

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
