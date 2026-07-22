import { expect, test } from "./support/fixtures";

const paragraph = (text: string) => ({
	root: {
		children: [
			{
				children: [
					{
						detail: 0,
						format: 0,
						mode: "normal",
						style: "",
						text,
						type: "text",
						version: 1,
					},
				],
				direction: "ltr",
				format: "",
				indent: 0,
				type: "paragraph",
				version: 1,
			},
		],
		direction: "ltr",
		format: "",
		indent: 0,
		type: "root",
		version: 1,
	},
});

test("restore reinserts a deleted subtree with its original ids, content, tags, and position", async ({
	orpcClient,
}) => {
	const root = await orpcClient.nodes.create({ parentId: null });

	try {
		const first = await orpcClient.nodes.create({ parentId: root.id });
		const toDelete = await orpcClient.nodes.create({
			parentId: root.id,
			afterId: first.id,
		});
		const last = await orpcClient.nodes.create({
			parentId: root.id,
			afterId: toDelete.id,
		});

		await orpcClient.nodes.updateContent({
			id: toDelete.id,
			content: paragraph("Deleted parent"),
		});
		await orpcClient.nodes.setType({
			id: toDelete.id,
			type: "task",
			metadata: { completed: true },
		});
		await orpcClient.nodes.setDueDate({
			id: toDelete.id,
			dueDate: "2026-08-01",
		});
		await orpcClient.nodes.setTags({ id: toDelete.id, tags: ["urgent"] });

		const child = await orpcClient.nodes.create({ parentId: toDelete.id });
		await orpcClient.nodes.updateContent({
			id: child.id,
			content: paragraph("Deleted child"),
		});
		await orpcClient.nodes.setTags({ id: child.id, tags: ["q3"] });

		const beforeDelete = await orpcClient.nodes.visibleTree({
			rootId: toDelete.id,
			cursor: null,
			includeCollapsedDescendants: true,
			limit: 10,
		});
		const childRow = beforeDelete.rows.find((r) => r.id === child.id);
		if (!childRow) throw new Error("child row not found before delete");

		await orpcClient.nodes.delete({ id: toDelete.id });

		const afterDelete = await orpcClient.nodes.visibleTree({
			rootId: root.id,
			cursor: null,
			includeCollapsedDescendants: true,
			limit: 10,
		});
		expect(afterDelete.rows.map((r) => r.id)).toEqual([first.id, last.id]);

		const restored = await orpcClient.nodes.restore({
			parentId: root.id,
			target: { position: "after", targetId: first.id },
			root: {
				id: toDelete.id,
				content: paragraph("Deleted parent"),
				type: "task",
				metadata: { completed: true },
				expanded: true,
				dueDate: "2026-08-01",
				tags: ["urgent"],
			},
			descendants: [
				{
					id: child.id,
					parentId: toDelete.id,
					order: childRow.order,
					content: paragraph("Deleted child"),
					type: "text",
					metadata: null,
					expanded: false,
					dueDate: null,
					tags: ["q3"],
				},
			],
		});

		expect(restored.id).toBe(toDelete.id);
		expect(restored.content).toEqual(paragraph("Deleted parent"));
		expect(restored.type).toBe("task");
		expect(restored.metadata).toEqual({ completed: true });
		expect(restored.dueDate).toBe("2026-08-01");
		expect(restored.tags).toEqual(["urgent"]);
		expect(restored.hasChildren).toBe(true);

		// Restored between its original neighbors, not appended at the end.
		const afterRestore = await orpcClient.nodes.visibleTree({
			rootId: root.id,
			cursor: null,
			includeCollapsedDescendants: true,
			limit: 10,
		});
		expect(afterRestore.rows.map((r) => r.id)).toEqual([
			first.id,
			toDelete.id,
			child.id,
			last.id,
		]);

		const restoredChild = afterRestore.rows.find((r) => r.id === child.id);
		expect(restoredChild?.content).toEqual(paragraph("Deleted child"));
		expect(restoredChild?.tags).toEqual(["q3"]);
		expect(restoredChild?.parentId).toBe(toDelete.id);
	} finally {
		await orpcClient.nodes.delete({ id: root.id });
	}
});

test("restore rejects a parent that no longer exists", async ({
	orpcClient,
}) => {
	await expect(
		orpcClient.nodes.restore({
			parentId: "00000000-0000-0000-0000-000000000000",
			target: { position: "append" },
			root: {
				id: "11111111-1111-1111-1111-111111111111",
				content: null,
				type: "text",
				metadata: null,
				expanded: false,
				dueDate: null,
				tags: [],
			},
			descendants: [],
		}),
	).rejects.toMatchObject({ code: "NOT_FOUND" });
});

test("restore rejects a sibling target that no longer exists", async ({
	orpcClient,
}) => {
	const root = await orpcClient.nodes.create({ parentId: null });
	try {
		await expect(
			orpcClient.nodes.restore({
				parentId: root.id,
				target: {
					position: "after",
					targetId: "00000000-0000-0000-0000-000000000000",
				},
				root: {
					id: "11111111-1111-1111-1111-111111111111",
					content: null,
					type: "text",
					metadata: null,
					expanded: false,
					dueDate: null,
					tags: [],
				},
				descendants: [],
			}),
		).rejects.toMatchObject({ code: "INVALID_MOVE" });
	} finally {
		await orpcClient.nodes.delete({ id: root.id });
	}
});
