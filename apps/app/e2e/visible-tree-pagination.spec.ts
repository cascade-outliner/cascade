import { expect, test } from "./support/fixtures";

/**
 * Regression test for issue #306: visibleTree's cursor pagination threw a
 * Postgres error ("cannot cast type record to text[]") for any cursor whose
 * path array had more than one element, i.e. any page boundary past the
 * first tree level. Scoped to a throwaway subtree via `rootId` (rather than
 * the shared top-level tree) so it stays correct when other e2e tests create
 * their own top-level scratch nodes in parallel.
 */
test("visibleTree paginates past a multi-level cursor without erroring", async ({
	orpcClient,
}) => {
	const root = await orpcClient.nodes.create({ parentId: null });

	try {
		const child = await orpcClient.nodes.create({ parentId: root.id });
		const grandchild = await orpcClient.nodes.create({ parentId: child.id });
		const secondChild = await orpcClient.nodes.create({ parentId: root.id });

		const firstPage = await orpcClient.nodes.visibleTree({
			rootId: root.id,
			cursor: null,
			includeCollapsedDescendants: true,
			limit: 2,
		});
		expect(firstPage.rows.map((r) => r.id)).toEqual([child.id, grandchild.id]);
		// The next cursor is the grandchild's path: its own order plus its
		// ancestor's, i.e. more than one element — exactly the shape that used
		// to make Postgres reject the query as an invalid cast from a row
		// constructor to text[].
		expect(firstPage.nextCursor).not.toBeNull();
		expect(firstPage.nextCursor?.length).toBeGreaterThan(1);

		const secondPage = await orpcClient.nodes.visibleTree({
			rootId: root.id,
			cursor: firstPage.nextCursor,
			includeCollapsedDescendants: true,
			limit: 10,
		});
		expect(secondPage.rows.map((r) => r.id)).toEqual([secondChild.id]);
		expect(secondPage.nextCursor).toBeNull();
	} finally {
		await orpcClient.nodes.delete({ id: root.id });
	}
});
