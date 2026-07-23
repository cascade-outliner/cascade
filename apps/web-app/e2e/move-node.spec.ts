import { expect, test } from "./support/fixtures";

/**
 * Regression test for issue #292: moveNode's "before"/"after" branches fetched
 * the target row scoped only by id + userId, never checking it actually
 * belongs to `parentId`. A stale or bogus `targetId` from a different parent
 * would silently anchor the fractional-index recompute against the wrong
 * sibling list instead of raising INVALID_MOVE.
 */
test("moveNode rejects a targetId that isn't a child of parentId", async ({
	orpcClient,
}) => {
	const parentA = await orpcClient.nodes.create({ parentId: null });
	const parentB = await orpcClient.nodes.create({ parentId: null });

	try {
		const moved = await orpcClient.nodes.create({ parentId: parentA.id });
		const foreignTarget = await orpcClient.nodes.create({
			parentId: parentB.id,
		});

		await expect(
			orpcClient.nodes.move({
				id: moved.id,
				parentId: parentA.id,
				position: "before",
				targetId: foreignTarget.id,
			}),
		).rejects.toThrow();

		// The rejected move must not have touched the node's parent/order.
		const page = await orpcClient.nodes.visibleTree({
			rootId: parentA.id,
			cursor: null,
			includeCollapsedDescendants: true,
			limit: 10,
		});
		expect(page.rows.map((r) => r.id)).toEqual([moved.id]);
	} finally {
		await orpcClient.nodes.delete({ id: parentA.id });
		await orpcClient.nodes.delete({ id: parentB.id });
	}
});
