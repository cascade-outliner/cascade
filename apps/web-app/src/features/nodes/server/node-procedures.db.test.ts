import type { VisibleNodeRow } from "@cascade/outliner/node-types";
import { call } from "@orpc/server";
import { eq, sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db";
import { nodeDeletionReceipts } from "@/db/schema";
import {
	createNode,
	createTag,
	deleteNode,
	deleteTag,
	duplicateNode,
	getNode,
	listNodes,
	listTags,
	moveNode,
	quickOpen,
	renameTag,
	resolveNodeSlug,
	restoreFromDeletionReceipt,
	restoreNode,
	setNodeDueDate,
	setNodeRecurrence,
	setNodeTags,
	setTaskCompleted,
	toggleNodeExpanded,
	updateNodeContent,
	visibleTree,
} from "@/features/nodes/server/procedures";
import { requestPremiumSeat } from "@/features/premium/server/premium-procedures";
import type { ORPCContext } from "@/orpc/context";
import {
	createTestUser,
	deleteTestUser,
} from "@/test-support/database-harness";

let userId: string;
let context: ORPCContext;

const content = (text: string) => ({
	root: {
		type: "root",
		children: [
			{
				type: "paragraph",
				children: [{ type: "text", text }],
			},
		],
	},
});

describe("recurring tasks", () => {
	it("advances an overdue task once to the first future occurrence", async () => {
		const task = await call(
			createNode,
			{
				parentId: null,
				initialType: { type: "task", metadata: { completed: false } },
				dueDate: "2026-07-20",
			},
			{ context },
		);
		await call(
			setNodeRecurrence,
			{ id: task.id, recurrence: { unit: "day", interval: 1 } },
			{ context },
		);

		const result = await call(
			setTaskCompleted,
			{
				id: task.id,
				completed: true,
				today: "2026-07-27",
				expectedDueDate: "2026-07-20",
			},
			{ context },
		);
		expect(result).toEqual({ advanced: true, nextDueDate: "2026-07-28" });
		expect(await call(getNode, { id: task.id }, { context })).toMatchObject({
			dueDate: "2026-07-28",
			metadata: { completed: false },
			recurrence: { unit: "day", interval: 1, anchorDay: 20 },
		});

		const retry = await call(
			setTaskCompleted,
			{
				id: task.id,
				completed: true,
				today: "2026-07-27",
				expectedDueDate: "2026-07-20",
			},
			{ context },
		);
		expect(retry).toEqual({ advanced: false, nextDueDate: "2026-07-28" });
	});

	it("resets completed tasks and clears recurrence with the due date", async () => {
		const task = await call(
			createNode,
			{
				parentId: null,
				initialType: { type: "task", metadata: { completed: true } },
				dueDate: "2026-01-31",
			},
			{ context },
		);
		await call(
			setNodeRecurrence,
			{ id: task.id, recurrence: { unit: "month", interval: 1 } },
			{ context },
		);
		expect(await call(getNode, { id: task.id }, { context })).toMatchObject({
			metadata: { completed: false },
			recurrence: { unit: "month", interval: 1, anchorDay: 31 },
		});

		await call(setNodeDueDate, { id: task.id, dueDate: null }, { context });
		expect(await call(getNode, { id: task.id }, { context })).toMatchObject({
			dueDate: null,
			recurrence: null,
		});
	});
});

describe("large subtree deletion", () => {
	it("records and deletes a subtree whose history snapshot exceeds one PostgreSQL parameter batch", async () => {
		await call(requestPremiumSeat, undefined, { context });
		const root = await call(createNode, { parentId: null }, { context });
		await db.execute(sql`
			INSERT INTO nodes (parent_id, user_id, "order")
			SELECT ${root.id}, ${userId}, 'child-' || lpad(value::text, 5, '0')
			FROM generate_series(1, 4681) AS value
		`);

		await expect(
			call(deleteNode, { id: root.id }, { context }),
		).resolves.toMatchObject({ childrenDeleted: 4681 });
	});
});

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

	it("creates a node with the requested conversion", async () => {
		const created = await call(
			createNode,
			{
				parentId: null,
				initialType: { type: "task", metadata: { completed: false } },
			},
			{ context },
		);

		expect(created).toMatchObject({
			type: "task",
			metadata: { completed: false },
			content: null,
		});
	});
});

describe("resolveNodeSlug", () => {
	it("uses slug text to disambiguate nodes with the same UUID first block", async () => {
		const sharedPrefix = crypto.randomUUID().slice(0, 8);
		const firstId = `${sharedPrefix}${crypto.randomUUID().slice(8)}`;
		const secondId = `${sharedPrefix}${crypto.randomUUID().slice(8)}`;

		await db.execute(sql`
			INSERT INTO nodes (id, user_id, content, "order")
			VALUES
				(${firstId}, ${userId}, ${JSON.stringify(content("First collision"))}::jsonb, 'a0'),
				(${secondId}, ${userId}, ${JSON.stringify(content("Second collision"))}::jsonb, 'a1')
		`);

		await expect(
			call(
				resolveNodeSlug,
				{ slugId: sharedPrefix, slugText: "second-collision" },
				{ context },
			),
		).resolves.toEqual({ id: secondId });
		await expect(
			call(
				resolveNodeSlug,
				{ slugId: sharedPrefix, slugText: null },
				{ context },
			),
		).rejects.toMatchObject({ code: "SLUG_AMBIGUOUS" });
	});
});

describe("quickOpen", () => {
	it("searches the full tree in DFS order with normalized matches and compact ancestors", async () => {
		const root = await call(createNode, { parentId: null }, { context });
		const child = await call(createNode, { parentId: root.id }, { context });
		const grandchild = await call(
			createNode,
			{ parentId: child.id },
			{ context },
		);
		const greatGrandchild = await call(
			createNode,
			{ parentId: grandchild.id },
			{ context },
		);
		const match = await call(
			createNode,
			{ parentId: greatGrandchild.id },
			{ context },
		);
		const secondRoot = await call(
			createNode,
			{ parentId: null, afterId: root.id },
			{ context },
		);

		for (const [id, text] of [
			[root.id, "Root"],
			[child.id, "Child"],
			[grandchild.id, "Grandchild"],
			[greatGrandchild.id, "Great grandchild"],
			[match.id, `${"leading ".repeat(40)}RÉSUMÉ match`],
			[secondRoot.id, "resume second"],
		] as const) {
			await call(
				updateNodeContent,
				{ id, content: content(text) },
				{ context },
			);
		}

		const results = await call(quickOpen, { query: "resume" }, { context });

		expect(results.map((result) => result.id)).toEqual([
			match.id,
			secondRoot.id,
		]);
		expect(results[0]).toMatchObject({
			ancestors: [
				{ id: root.id, text: "Root" },
				{ id: grandchild.id, text: "Grandchild" },
				{ id: greatGrandchild.id, text: "Great grandchild" },
			],
			omittedAncestorCount: 1,
			snippet: { hasPrefix: true },
		});
		expect(results[0].snippet.highlightRanges).toHaveLength(1);
	});

	it("treats SQL wildcard characters as literal query text", async () => {
		const literal = await call(createNode, { parentId: null }, { context });
		const wildcardOnly = await call(
			createNode,
			{ parentId: null, afterId: literal.id },
			{ context },
		);
		await call(
			updateNodeContent,
			{ id: literal.id, content: content("budget 50%_done") },
			{ context },
		);
		await call(
			updateNodeContent,
			{ id: wildcardOnly.id, content: content("budget 50x done") },
			{ context },
		);

		const results = await call(quickOpen, { query: "%_" }, { context });
		expect(results.map((result) => result.id)).toEqual([literal.id]);
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

describe("restoreFromDeletionReceipt", () => {
	it("restores ids, structure, tags, and due dates from a delete's receipt", async () => {
		const root = await call(createNode, { parentId: null }, { context });
		const child = await call(createNode, { parentId: root.id }, { context });
		await call(
			setNodeDueDate,
			{ id: root.id, dueDate: "2026-09-01" },
			{ context },
		);
		await call(setNodeTags, { id: child.id, tags: ["saved"] }, { context });

		const { receiptId } = await call(deleteNode, { id: root.id }, { context });
		expect(receiptId).toBeTruthy();

		const result = await call(
			restoreFromDeletionReceipt,
			{ receiptId: receiptId as string },
			{ context },
		);
		expect(result.placement).toBe("exact");

		const [restoredRoot] = await call(
			listNodes,
			{ parentId: null },
			{ context },
		);
		const [restoredChild] = await call(
			listNodes,
			{ parentId: restoredRoot.id },
			{ context },
		);
		expect(restoredRoot).toMatchObject({ id: root.id, dueDate: "2026-09-01" });
		expect(restoredChild).toMatchObject({ id: child.id, tags: ["saved"] });
	});

	it("captures collapsed descendants atomically, independent of what the client has loaded", async () => {
		const root = await call(createNode, { parentId: null }, { context });
		const child = await call(createNode, { parentId: root.id }, { context });
		await call(
			toggleNodeExpanded,
			{ id: root.id, expanded: false },
			{ context },
		);

		const { receiptId } = await call(deleteNode, { id: root.id }, { context });
		await call(
			restoreFromDeletionReceipt,
			{ receiptId: receiptId as string },
			{ context },
		);

		const restoredChildren = await call(
			listNodes,
			{ parentId: root.id },
			{ context },
		);
		expect(restoredChildren.map((c) => c.id)).toEqual([child.id]);
	});

	it("rejects consuming the same receipt twice", async () => {
		const node = await call(createNode, { parentId: null }, { context });
		const { receiptId } = await call(deleteNode, { id: node.id }, { context });

		await call(
			restoreFromDeletionReceipt,
			{ receiptId: receiptId as string },
			{ context },
		);
		await expect(
			call(
				restoreFromDeletionReceipt,
				{ receiptId: receiptId as string },
				{ context },
			),
		).rejects.toMatchObject({ code: "RECEIPT_CONSUMED" });
	});

	it("rejects an unknown receipt id", async () => {
		await expect(
			call(
				restoreFromDeletionReceipt,
				{ receiptId: "does-not-exist" },
				{ context },
			),
		).rejects.toMatchObject({ code: "RECEIPT_NOT_FOUND" });
	});

	it("rejects a receipt belonging to another user", async () => {
		const node = await call(createNode, { parentId: null }, { context });
		const { receiptId } = await call(deleteNode, { id: node.id }, { context });

		const other = await createTestUser();
		try {
			await expect(
				call(
					restoreFromDeletionReceipt,
					{ receiptId: receiptId as string },
					{ context: other.context },
				),
			).rejects.toMatchObject({ code: "RECEIPT_NOT_FOUND" });
		} finally {
			await deleteTestUser(other.user.id);
		}
	});

	it("rejects an expired receipt", async () => {
		const node = await call(createNode, { parentId: null }, { context });
		const { receiptId } = await call(deleteNode, { id: node.id }, { context });
		await db
			.update(nodeDeletionReceipts)
			.set({ expiresAt: new Date(Date.now() - 1_000) })
			.where(eq(nodeDeletionReceipts.id, receiptId as string));

		await expect(
			call(
				restoreFromDeletionReceipt,
				{ receiptId: receiptId as string },
				{ context },
			),
		).rejects.toMatchObject({ code: "RECEIPT_EXPIRED" });
	});

	it("falls back to the tree root when the original parent was deleted first", async () => {
		const parent = await call(createNode, { parentId: null }, { context });
		const child = await call(createNode, { parentId: parent.id }, { context });
		const { receiptId } = await call(deleteNode, { id: child.id }, { context });
		await call(deleteNode, { id: parent.id }, { context });

		const result = await call(
			restoreFromDeletionReceipt,
			{ receiptId: receiptId as string },
			{ context },
		);
		expect(result.placement).toBe("fallback-root");

		const roots = await call(listNodes, { parentId: null }, { context });
		expect(roots.map((r) => r.id)).toContain(child.id);
	});

	it("rejects restoring into ids that already exist", async () => {
		const node = await call(createNode, { parentId: null }, { context });
		const { receiptId } = await call(deleteNode, { id: node.id }, { context });
		await db.execute(sql`
			INSERT INTO nodes (id, user_id, "order")
			VALUES (${node.id}, ${userId}, 'z')
		`);

		await expect(
			call(
				restoreFromDeletionReceipt,
				{ receiptId: receiptId as string },
				{ context },
			),
		).rejects.toMatchObject({ code: "ID_COLLISION" });
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
	it("creates an unused tag and rejects duplicate names", async () => {
		await call(createTag, { name: "planned" }, { context });

		expect(await call(listTags, undefined, { context })).toContainEqual({
			name: "planned",
			count: 0,
		});
		await expect(
			call(createTag, { name: "PLANNED" }, { context }),
		).rejects.toMatchObject({ code: "CONFLICT" });
	});

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

	it("renames a tag across every associated node", async () => {
		const first = await call(createNode, { parentId: null }, { context });
		const second = await call(createNode, { parentId: null }, { context });
		await call(setNodeTags, { id: first.id, tags: ["old"] }, { context });
		await call(setNodeTags, { id: second.id, tags: ["old"] }, { context });

		await call(renameTag, { name: "old", newName: "renamed" }, { context });

		const listedTags = await call(listTags, undefined, { context });
		expect(listedTags).toContainEqual({ name: "renamed", count: 2 });
		expect(listedTags.map(({ name }) => name)).not.toContain("old");
	});

	it("rejects renaming a tag to an existing name", async () => {
		const node = await call(createNode, { parentId: null }, { context });
		await call(
			setNodeTags,
			{ id: node.id, tags: ["first", "second"] },
			{
				context,
			},
		);

		await expect(
			call(renameTag, { name: "first", newName: "SECOND" }, { context }),
		).rejects.toMatchObject({ code: "CONFLICT" });
	});
});
