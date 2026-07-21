import { expect, test } from "./support/fixtures";

/**
 * Regression test for issue #317: createNode's `afterId` anchor was fetched
 * scoped only by id + userId, never checking it actually belongs to
 * `parentId`. A stale or bogus `afterId` from a different parent (e.g. a
 * concurrent move relocating the anchor between drag and request) would
 * silently anchor the fractional-index computation against the wrong
 * sibling list instead of raising an error.
 */
test("createNode rejects an afterId that isn't a child of parentId", async ({
	orpcClient,
}) => {
	const parentA = await orpcClient.nodes.create({ parentId: null });
	const parentB = await orpcClient.nodes.create({ parentId: null });

	try {
		const foreignAnchor = await orpcClient.nodes.create({
			parentId: parentB.id,
		});

		await expect(
			orpcClient.nodes.create({
				parentId: parentA.id,
				afterId: foreignAnchor.id,
			}),
		).rejects.toThrow();

		// The rejected create must not have inserted anything under parentA.
		const page = await orpcClient.nodes.visibleTree({
			rootId: parentA.id,
			cursor: null,
			includeCollapsedDescendants: true,
			limit: 10,
		});
		expect(page.rows).toEqual([]);
	} finally {
		await orpcClient.nodes.delete({ id: parentA.id });
		await orpcClient.nodes.delete({ id: parentB.id });
	}
});
