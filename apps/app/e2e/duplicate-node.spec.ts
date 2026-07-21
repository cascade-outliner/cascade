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

test("duplicate copies a node's content, tags, due date, and type, recursively copies its subtree preserving order, and inserts the copy as the next sibling", async ({
	orpcClient,
}) => {
	const root = await orpcClient.nodes.create({ parentId: null });

	try {
		const original = await orpcClient.nodes.create({ parentId: root.id });
		await orpcClient.nodes.updateContent({
			id: original.id,
			content: paragraph("Original"),
		});
		await orpcClient.nodes.setType({
			id: original.id,
			type: "task",
			metadata: { completed: true },
		});
		await orpcClient.nodes.setDueDate({
			id: original.id,
			dueDate: "2026-08-01",
		});
		await orpcClient.nodes.setTags({ id: original.id, tags: ["urgent", "q3"] });

		const child1 = await orpcClient.nodes.create({ parentId: original.id });
		await orpcClient.nodes.updateContent({
			id: child1.id,
			content: paragraph("Child 1"),
		});
		const grandchild = await orpcClient.nodes.create({ parentId: child1.id });
		await orpcClient.nodes.updateContent({
			id: grandchild.id,
			content: paragraph("Grandchild"),
		});
		const child2 = await orpcClient.nodes.create({ parentId: original.id });
		await orpcClient.nodes.updateContent({
			id: child2.id,
			content: paragraph("Child 2"),
		});

		// A later sibling: the duplicate must land between `original` and this,
		// not at the end of the parent's children.
		const laterSibling = await orpcClient.nodes.create({
			parentId: root.id,
			afterId: original.id,
		});

		const duplicated = await orpcClient.nodes.duplicate({ id: original.id });

		expect(duplicated.id).not.toBe(original.id);
		expect(duplicated.parentId).toBe(root.id);
		expect(duplicated.content).toEqual(paragraph("Original"));
		expect(duplicated.type).toBe("task");
		expect(duplicated.metadata).toEqual({ completed: true });
		expect(duplicated.dueDate).toBe("2026-08-01");
		expect(duplicated.tags).toEqual(["q3", "urgent"]);
		expect(duplicated.hasChildren).toBe(true);

		const page = await orpcClient.nodes.visibleTree({
			rootId: root.id,
			cursor: null,
			includeCollapsedDescendants: true,
			limit: 100,
		});

		// Top-level order: original, its duplicate, then the pre-existing next
		// sibling — the duplicate must be inserted immediately after the
		// original, not appended at the end.
		const topLevel = page.rows.filter((r) => r.parentId === root.id);
		expect(topLevel.map((r) => r.id)).toEqual([
			original.id,
			duplicated.id,
			laterSibling.id,
		]);

		const byParent = new Map<string, (typeof page.rows)[number][]>();
		for (const row of page.rows) {
			const parentId = row.parentId ?? "";
			byParent.set(parentId, [...(byParent.get(parentId) ?? []), row]);
		}
		type Row = (typeof page.rows)[number];
		const shape = (row: Row): unknown => ({
			content: row.content,
			type: row.type,
			metadata: row.metadata,
			dueDate: row.dueDate,
			tags: row.tags,
			expanded: row.expanded,
			children: (byParent.get(row.id) ?? []).map(shape),
		});

		// The duplicated subtree's shape (content/type/metadata/dueDate/tags at
		// every depth, and the two children in the same order) must mirror the
		// original's, id differences aside.
		expect(shape(page.rows.find((r) => r.id === duplicated.id) as Row)).toEqual(
			shape(page.rows.find((r) => r.id === original.id) as Row),
		);

		// Every id in the duplicated subtree must be freshly generated.
		const originalIds = new Set(
			[original, child1, grandchild, child2].map((n) => n.id),
		);
		const duplicatedSubtreeIds = page.rows
			.filter(
				(r) =>
					r.id === duplicated.id || isDescendantOf(page.rows, r, duplicated.id),
			)
			.map((r) => r.id);
		for (const id of duplicatedSubtreeIds) {
			expect(originalIds.has(id)).toBe(false);
		}
	} finally {
		await orpcClient.nodes.delete({ id: root.id });
	}
});

function isDescendantOf(
	rows: { id: string; parentId: string | null }[],
	row: { id: string; parentId: string | null },
	ancestorId: string,
): boolean {
	let current: { id: string; parentId: string | null } | undefined = row;
	while (current) {
		if (current.parentId === ancestorId) return true;
		current = rows.find((r) => r.id === current?.parentId);
	}
	return false;
}

test("duplicate rejects a node id that doesn't belong to the caller", async ({
	orpcClient,
}) => {
	await expect(
		orpcClient.nodes.duplicate({ id: "00000000-0000-0000-0000-000000000000" }),
	).rejects.toMatchObject({ code: "NOT_FOUND" });
});
