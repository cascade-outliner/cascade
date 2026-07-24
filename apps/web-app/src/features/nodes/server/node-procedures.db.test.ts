import type { VisibleNodeRow } from "@cascade/outliner/node-types";
import { call } from "@orpc/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	createNode,
	deleteNode,
	deleteTag,
	duplicateNode,
	listNodes,
	listTags,
	moveNode,
	restoreNode,
	setNodeTags,
	toggleNodeExpanded,
	visibleTree,
} from "@/features/nodes/server/procedures";
import type { ORPCContext } from "@/orpc/context";
import {
	createTestUser,
	deleteTestUser,
} from "@/test-support/database-harness";

let userId: string;
let context: ORPCContext;

beforeEach(async () => {
	const testUser = await createTestUser();
	userId = testUser.user.id;
	context = testUser.context;
});

afterEach(async () => {
	await deleteTestUser(userId);
});

describe("createNode", () => {
	it("appends new root nodes in creation order with strictly increasing order keys", async () => {
		const a = await call(createNode, { parentId: null }, { context });
		const b = await call(createNode, { parentId: null }, { context });
		const c = await call(createNode, { parentId: null }, { context });

		const rows = await call(listNodes, { parentId: null }, { context });
		expect(rows.map((r) => r.id)).toEqual([a.id, b.id, c.id]);
		expect(rows[0].order < rows[1].order).toBe(true);
		expect(rows[1].order < rows[2].order).toBe(true);
	});

	it("inserts after a given afterId, between it and the next sibling", async () => {
		const a = await call(createNode, { parentId: null }, { context });
		const b = await call(createNode, { parentId: null }, { context });
		const c = await call(
			createNode,
			{ parentId: null, afterId: a.id },
			{ context },
		);

		const rows = await call(listNodes, { parentId: null }, { context });
		expect(rows.map((r) => r.id)).toEqual([a.id, c.id, b.id]);
	});

	it("rejects an unknown afterId with NOT_FOUND", async () => {
		await expect(
			call(
				createNode,
				{ parentId: null, afterId: crypto.randomUUID() },
				{ context },
			),
		).rejects.toMatchObject({ code: "NOT_FOUND" });
	});

	it("stamps tags onto the new node so it matches an active tag filter immediately", async () => {
		const created = await call(
			createNode,
			{ parentId: null, tags: ["urgent", "Work"] },
			{ context },
		);
		expect(created.tags).toEqual(["Work", "urgent"]);

		const [listed] = await call(listNodes, { parentId: null }, { context });
		expect(listed.tags).toEqual(["Work", "urgent"]);

		const allTags = await call(listTags, undefined, { context });
		expect(allTags.map((t) => t.name).sort()).toEqual(["Work", "urgent"]);
	});
});

describe("moveNode", () => {
	it("reorders siblings with before/after/append", async () => {
		const a = await call(createNode, { parentId: null }, { context });
		const b = await call(createNode, { parentId: null }, { context });
		const c = await call(createNode, { parentId: null }, { context });

		await call(
			moveNode,
			{ id: c.id, parentId: null, position: "before", targetId: a.id },
			{ context },
		);
		let rows = await call(listNodes, { parentId: null }, { context });
		expect(rows.map((r) => r.id)).toEqual([c.id, a.id, b.id]);

		await call(
			moveNode,
			{ id: a.id, parentId: null, position: "after", targetId: b.id },
			{ context },
		);
		rows = await call(listNodes, { parentId: null }, { context });
		expect(rows.map((r) => r.id)).toEqual([c.id, b.id, a.id]);

		await call(
			moveNode,
			{ id: c.id, parentId: b.id, position: "append" },
			{ context },
		);
		const bChildren = await call(listNodes, { parentId: b.id }, { context });
		expect(bChildren.map((r) => r.id)).toEqual([c.id]);
	});

	it("rejects moving a node into its own subtree with INVALID_MOVE", async () => {
		const parent = await call(createNode, { parentId: null }, { context });
		const child = await call(createNode, { parentId: parent.id }, { context });

		await expect(
			call(
				moveNode,
				{ id: parent.id, parentId: child.id, position: "append" },
				{ context },
			),
		).rejects.toMatchObject({ code: "INVALID_MOVE" });
	});

	it("rejects moving a node under itself with INVALID_MOVE", async () => {
		const parent = await call(createNode, { parentId: null }, { context });

		await expect(
			call(
				moveNode,
				{ id: parent.id, parentId: parent.id, position: "append" },
				{ context },
			),
		).rejects.toMatchObject({ code: "INVALID_MOVE" });
	});
});

describe("visibleTree", () => {
	it("walks depth-first, hiding descendants of collapsed nodes by default", async () => {
		const root = await call(createNode, { parentId: null }, { context });
		await call(
			toggleNodeExpanded,
			{ id: root.id, expanded: true },
			{ context },
		);
		const c1 = await call(createNode, { parentId: root.id }, { context });
		const c2 = await call(
			createNode,
			{ parentId: root.id, afterId: c1.id },
			{ context },
		);
		await call(createNode, { parentId: c1.id }, { context });

		const collapsed = await call(
			visibleTree,
			{
				rootId: null,
				cursor: null,
				includeCollapsedDescendants: false,
				limit: 500,
			},
			{ context },
		);
		expect(collapsed.rows.map((r) => r.id)).toEqual([root.id, c1.id, c2.id]);
		expect(collapsed.nextCursor).toBeNull();

		const expanded = await call(
			visibleTree,
			{
				rootId: null,
				cursor: null,
				includeCollapsedDescendants: true,
				limit: 500,
			},
			{ context },
		);
		expect(expanded.rows).toHaveLength(4);
		expect(expanded.rows[0]).toMatchObject({
			id: root.id,
			depth: 0,
			parentId: null,
			hasChildren: true,
			isLastChild: true,
		});
		expect(expanded.rows[1]).toMatchObject({ id: c1.id, depth: 1 });
		// c1's grandchild is depth-first inserted before c2.
		expect(expanded.rows[2].parentId).toBe(c1.id);
		expect(expanded.rows[3]).toMatchObject({ id: c2.id, depth: 1 });
	});

	it("paginates by cursor without gaps, duplicates, or reordering", async () => {
		const created = [];
		for (let i = 0; i < 5; i++) {
			created.push(await call(createNode, { parentId: null }, { context }));
		}

		const fullPage = await call(
			visibleTree,
			{
				rootId: null,
				cursor: null,
				includeCollapsedDescendants: false,
				limit: 500,
			},
			{ context },
		);
		expect(fullPage.rows.map((r) => r.id)).toEqual(created.map((n) => n.id));
		expect(fullPage.nextCursor).toBeNull();

		const paged: string[] = [];
		let cursor: string[] | null = null;
		for (let guard = 0; guard < 10; guard++) {
			const result: { rows: VisibleNodeRow[]; nextCursor: string[] | null } =
				await call(
					visibleTree,
					{
						rootId: null,
						cursor,
						includeCollapsedDescendants: false,
						limit: 2,
					},
					{ context },
				);
			paged.push(...result.rows.map((row) => row.id));
			cursor = result.nextCursor;
			if (cursor === null) break;
		}

		expect(paged).toEqual(created.map((n) => n.id));
	});
});

describe("deleteNode", () => {
	it("cascades to descendants and reports how many were deleted", async () => {
		const parent = await call(createNode, { parentId: null }, { context });
		const child = await call(createNode, { parentId: parent.id }, { context });
		await call(createNode, { parentId: child.id }, { context });

		const result = await call(deleteNode, { id: parent.id }, { context });
		expect(result.childrenDeleted).toBe(2);

		const roots = await call(listNodes, { parentId: null }, { context });
		expect(roots.map((r) => r.id)).not.toContain(parent.id);

		const remainingChildren = await call(
			listNodes,
			{ parentId: parent.id },
			{ context },
		);
		expect(remainingChildren).toHaveLength(0);
		const remainingGrandchildren = await call(
			listNodes,
			{ parentId: child.id },
			{ context },
		);
		expect(remainingGrandchildren).toHaveLength(0);
	});
});

describe("duplicateNode / restoreNode", () => {
	it("copies and restores a complete tagged subtree", async () => {
		const root = await call(createNode, { parentId: null }, { context });
		const child = await call(createNode, { parentId: root.id }, { context });
		await call(setNodeTags, { id: child.id, tags: ["copied"] }, { context });

		const duplicate = await call(duplicateNode, { id: root.id }, { context });
		const duplicateChildren = await call(
			listNodes,
			{ parentId: duplicate.id },
			{ context },
		);
		expect(duplicateChildren).toHaveLength(1);
		expect(duplicateChildren[0]?.tags).toEqual(["copied"]);

		const [childSnapshot] = await call(
			listNodes,
			{ parentId: root.id },
			{ context },
		);
		await call(deleteNode, { id: root.id }, { context });
		await call(
			restoreNode,
			{
				parentId: null,
				target: { position: "append" },
				root: {
					id: root.id,
					content: null,
					type: "text",
					metadata: null,
					expanded: false,
					dueDate: null,
					tags: [],
				},
				descendants: [
					{
						id: child.id,
						parentId: root.id,
						content: null,
						type: "text",
						metadata: null,
						expanded: false,
						order: childSnapshot.order,
						dueDate: null,
						tags: ["copied"],
					},
				],
			},
			{ context },
		);

		const restoredChildren = await call(
			listNodes,
			{ parentId: root.id },
			{ context },
		);
		expect(restoredChildren).toHaveLength(1);
		expect(restoredChildren[0]?.id).toBe(child.id);
		expect(restoredChildren[0]?.tags).toEqual(["copied"]);
	});
});

describe("setNodeTags / listTags / deleteTag", () => {
	it("upserts tags, replaces a node's tag links, and keeps unused tags listed with count 0", async () => {
		const node = await call(createNode, { parentId: null }, { context });

		await call(setNodeTags, { id: node.id, tags: ["a", "b"] }, { context });
		let tags = await call(listTags, undefined, { context });
		expect(tags).toEqual(
			expect.arrayContaining([
				{ name: "a", count: 1 },
				{ name: "b", count: 1 },
			]),
		);

		await call(setNodeTags, { id: node.id, tags: ["b", "c"] }, { context });
		tags = await call(listTags, undefined, { context });
		expect(tags).toEqual(
			expect.arrayContaining([
				{ name: "a", count: 0 },
				{ name: "b", count: 1 },
				{ name: "c", count: 1 },
			]),
		);

		await call(deleteTag, { name: "b" }, { context });
		tags = await call(listTags, undefined, { context });
		expect(tags.map((t) => t.name)).not.toContain("b");
	});

	it("rejects deleting an unknown tag with NOT_FOUND", async () => {
		await expect(
			call(deleteTag, { name: "does-not-exist" }, { context }),
		).rejects.toMatchObject({ code: "NOT_FOUND" });
	});
});
