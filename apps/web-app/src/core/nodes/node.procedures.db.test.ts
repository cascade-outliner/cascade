import type { VisibleNodeRow } from "@cascade/outliner/node-types";
import { call } from "@orpc/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	calendarDayNodes,
	calendarDays,
	calendarMonths,
	calendarYears,
} from "@/core/nodes/node-calendar.procedures";
import { createNode, deleteNode } from "@/core/nodes/node-crud.procedures";
import { setNodeDueDate } from "@/core/nodes/node-due-date.procedures";
import {
	moveNode,
	toggleNodeExpanded,
} from "@/core/nodes/node-structure.procedures";
import {
	deleteTag,
	listTags,
	setNodeTags,
} from "@/core/nodes/node-tags.procedures";
import { listNodes, visibleTree } from "@/core/nodes/node-tree-read.procedures";
import type { ORPCContext } from "@/orpc/context";
import { createTestUser, deleteTestUser } from "@/test-db/harness";

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

describe("calendarYears / calendarMonths / calendarDays / calendarDayNodes", () => {
	it("only surfaces years, months, and days that have a due node, with counts", async () => {
		const a = await call(createNode, { parentId: null }, { context });
		const b = await call(createNode, { parentId: null }, { context });
		const c = await call(createNode, { parentId: null }, { context });
		await call(createNode, { parentId: null }, { context }); // no due date: excluded everywhere

		await call(
			setNodeDueDate,
			{ id: a.id, dueDate: "2026-07-23" },
			{ context },
		);
		await call(
			setNodeDueDate,
			{ id: b.id, dueDate: "2026-07-23" },
			{ context },
		);
		await call(
			setNodeDueDate,
			{ id: c.id, dueDate: "2027-01-05" },
			{ context },
		);

		const years = await call(calendarYears, undefined, { context });
		expect(years).toEqual([
			{ year: 2026, count: 2 },
			{ year: 2027, count: 1 },
		]);

		const months2026 = await call(calendarMonths, { year: 2026 }, { context });
		expect(months2026).toEqual([{ month: 7, count: 2 }]);
		const months2027 = await call(calendarMonths, { year: 2027 }, { context });
		expect(months2027).toEqual([{ month: 1, count: 1 }]);

		const days = await call(
			calendarDays,
			{ year: 2026, month: 7 },
			{ context },
		);
		expect(days).toEqual([{ day: 23, count: 2 }]);

		const dayNodes = await call(
			calendarDayNodes,
			{ date: "2026-07-23" },
			{ context },
		);
		expect(dayNodes.map((n) => n.id).sort()).toEqual([a.id, b.id].sort());
	});

	it("stops surfacing a bucket once its last due node is cleared", async () => {
		const a = await call(createNode, { parentId: null }, { context });
		await call(
			setNodeDueDate,
			{ id: a.id, dueDate: "2026-03-10" },
			{ context },
		);
		expect(await call(calendarYears, undefined, { context })).toEqual([
			{ year: 2026, count: 1 },
		]);

		await call(setNodeDueDate, { id: a.id, dueDate: null }, { context });
		expect(await call(calendarYears, undefined, { context })).toEqual([]);
	});
});
