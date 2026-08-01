import type { Page } from "@playwright/test";
import { toNodeSlug } from "@/features/nodes/model/node-slug";
import { expect, test } from "./support/fixtures";
import { treeRow } from "./support/tree-row";

function lexicalContent(text: string) {
	return {
		root: {
			type: "root" as const,
			children: [
				{
					type: "paragraph" as const,
					children: [{ type: "text" as const, text }],
				},
			],
		},
	};
}

/** `@tanstack/react-hotkeys`' `Mod` resolves to Meta on macOS, Control elsewhere. */
const modifierKey = process.platform === "darwin" ? "Meta" : "Control";

async function undo(page: Page) {
	await page.keyboard.press(`${modifierKey}+z`);
	await expect(page.getByText("Undone")).toBeVisible();
}

async function redo(page: Page) {
	await page.keyboard.press(`${modifierKey}+Shift+z`);
	await expect(page.getByText("Redone")).toBeVisible();
}

test("undo/redo a create", async ({ page, orpcClient }) => {
	const uniqueSuffix = Date.now().toString();
	const root = await orpcClient.nodes.create({ parentId: null });

	try {
		await orpcClient.nodes.updateContent({
			id: root.id,
			content: lexicalContent(`Undo create root ${uniqueSuffix}`),
		});
		await orpcClient.nodes.toggleExpanded({ id: root.id, expanded: true });

		const rootSlug = toNodeSlug({
			id: root.id,
			content: lexicalContent(`Undo create root ${uniqueSuffix}`),
		});
		await page.goto(`/${rootSlug}`);

		// The undo/redo snapshot for a create captures the row as it existed at
		// creation time (empty), before any later typing is saved, so identify
		// the new row by id rather than by content typed into it afterward.
		const nodeIds = () =>
			page
				.locator("[data-node-id]")
				.evaluateAll((rows) =>
					rows.map((row) => row.getAttribute("data-node-id")),
				);
		const idsBefore = await nodeIds();

		await page.getByRole("button", { name: "Add node" }).click();
		await expect.poll(nodeIds).toHaveLength(idsBefore.length + 1);
		const newId = (await nodeIds()).find((id) => !idsBefore.includes(id));
		if (!newId) throw new Error("new node id not found");
		const newRow = page.locator(`[data-node-id="${newId}"]`);
		await expect(newRow).toBeVisible();

		await undo(page);
		await expect(newRow).toBeHidden();

		await redo(page);
		await expect(newRow).toBeVisible();
	} finally {
		await orpcClient.nodes.delete({ id: root.id });
	}
});

test("undo/redo an edit", async ({ page, orpcClient }) => {
	const uniqueSuffix = Date.now().toString();
	const root = await orpcClient.nodes.create({ parentId: null });

	try {
		await orpcClient.nodes.updateContent({
			id: root.id,
			content: lexicalContent(`Undo edit root ${uniqueSuffix}`),
		});
		await orpcClient.nodes.toggleExpanded({ id: root.id, expanded: true });

		const edited = await orpcClient.nodes.create({ parentId: root.id });
		await orpcClient.nodes.updateContent({
			id: edited.id,
			content: lexicalContent(`Original text ${uniqueSuffix}`),
		});
		// A sibling to move focus to via Shift+ArrowDown, which both commits the
		// edit above and moves off it — the only way to blur/save that has no
		// other side effect (unlike Enter, which also creates a new node).
		const sibling = await orpcClient.nodes.create({
			parentId: root.id,
			afterId: edited.id,
		});
		await orpcClient.nodes.updateContent({
			id: sibling.id,
			content: lexicalContent(`Sibling ${uniqueSuffix}`),
		});

		const rootSlug = toNodeSlug({
			id: root.id,
			content: lexicalContent(`Undo edit root ${uniqueSuffix}`),
		});
		await page.goto(`/${rootSlug}`);

		await treeRow(page, `Original text ${uniqueSuffix}`)
			.getByRole("button", { name: "Edit node text" })
			.click();
		await page.keyboard.press(`${modifierKey}+a`);
		await page.keyboard.type(`Edited text ${uniqueSuffix}`);
		await page.keyboard.press("Shift+ArrowDown");

		await expect(treeRow(page, `Edited text ${uniqueSuffix}`)).toBeVisible();
		await expect(treeRow(page, `Original text ${uniqueSuffix}`)).toBeHidden();

		await undo(page);
		await expect(treeRow(page, `Original text ${uniqueSuffix}`)).toBeVisible();
		await expect(treeRow(page, `Edited text ${uniqueSuffix}`)).toBeHidden();

		await redo(page);
		await expect(treeRow(page, `Edited text ${uniqueSuffix}`)).toBeVisible();
	} finally {
		await orpcClient.nodes.delete({ id: root.id });
	}
});

test("undo/redo a move", async ({ page, orpcClient }) => {
	const uniqueSuffix = Date.now().toString();
	const root = await orpcClient.nodes.create({ parentId: null });

	try {
		await orpcClient.nodes.updateContent({
			id: root.id,
			content: lexicalContent(`Undo move root ${uniqueSuffix}`),
		});
		await orpcClient.nodes.toggleExpanded({ id: root.id, expanded: true });

		const first = await orpcClient.nodes.create({ parentId: root.id });
		await orpcClient.nodes.updateContent({
			id: first.id,
			content: lexicalContent(`First sibling ${uniqueSuffix}`),
		});
		const second = await orpcClient.nodes.create({
			parentId: root.id,
			afterId: first.id,
		});
		await orpcClient.nodes.updateContent({
			id: second.id,
			content: lexicalContent(`Second sibling ${uniqueSuffix}`),
		});

		const rootSlug = toNodeSlug({
			id: root.id,
			content: lexicalContent(`Undo move root ${uniqueSuffix}`),
		});
		await page.goto(`/${rootSlug}`);

		const order = () =>
			page
				.locator("[data-node-id]")
				.evaluateAll((rows) =>
					rows.map((row) => row.getAttribute("data-node-id")),
				);

		await expect.poll(order).toEqual([first.id, second.id]);

		await treeRow(page, `First sibling ${uniqueSuffix}`)
			.locator("[data-node-focus-target]")
			.focus();
		await page.keyboard.press("Alt+Shift+ArrowDown");
		await expect.poll(order).toEqual([second.id, first.id]);

		await undo(page);
		await expect.poll(order).toEqual([first.id, second.id]);

		await redo(page);
		await expect.poll(order).toEqual([second.id, first.id]);
	} finally {
		await orpcClient.nodes.delete({ id: root.id });
	}
});

test("undo/redo a delete", async ({ page, orpcClient }) => {
	const uniqueSuffix = Date.now().toString();
	const root = await orpcClient.nodes.create({ parentId: null });

	try {
		await orpcClient.nodes.updateContent({
			id: root.id,
			content: lexicalContent(`Undo delete root ${uniqueSuffix}`),
		});
		await orpcClient.nodes.toggleExpanded({ id: root.id, expanded: true });

		const child = await orpcClient.nodes.create({ parentId: root.id });
		await orpcClient.nodes.updateContent({
			id: child.id,
			content: lexicalContent(`Deletable node ${uniqueSuffix}`),
		});

		const rootSlug = toNodeSlug({
			id: root.id,
			content: lexicalContent(`Undo delete root ${uniqueSuffix}`),
		});
		await page.goto(`/${rootSlug}`);

		await treeRow(page, `Deletable node ${uniqueSuffix}`).click({
			button: "right",
		});
		await page.getByRole("menuitem", { name: "Delete", exact: true }).click();
		await expect(treeRow(page, `Deletable node ${uniqueSuffix}`)).toBeHidden();

		await undo(page);
		await expect(treeRow(page, `Deletable node ${uniqueSuffix}`)).toBeVisible();

		await redo(page);
		await expect(treeRow(page, `Deletable node ${uniqueSuffix}`)).toBeHidden();
	} finally {
		await orpcClient.nodes.delete({ id: root.id });
	}
});
