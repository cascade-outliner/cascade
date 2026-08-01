import { buildVisibleTree } from "@cascade/outliner/build-visible-tree";
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

test("opens the keyboard shortcuts reference from the user menu and via Shift+?", async ({
	page,
}) => {
	await page.goto("/");

	await page.getByRole("button", { name: "User menu" }).click();
	await page.getByRole("menuitem", { name: "Keyboard shortcuts" }).click();

	await expect(
		page.getByRole("dialog", { name: "Keyboard shortcuts" }),
	).toBeVisible();
	await expect(page.getByRole("heading", { name: "Reordering" })).toBeVisible();
	await expect(
		page.getByText("Move the node up among its siblings"),
	).toBeVisible();

	await page.getByRole("button", { name: "Close keyboard shortcuts" }).click();
	await expect(
		page.getByRole("dialog", { name: "Keyboard shortcuts" }),
	).toBeHidden();

	await page.keyboard.press("Shift+?");
	await expect(
		page.getByRole("dialog", { name: "Keyboard shortcuts" }),
	).toBeVisible();
});

test("Alt+Shift+ArrowDown/Up reorders the focused node among its siblings", async ({
	page,
	orpcClient,
}) => {
	const uniqueSuffix = Date.now().toString();
	const root = await orpcClient.nodes.create({ parentId: null });

	try {
		await orpcClient.nodes.updateContent({
			id: root.id,
			content: lexicalContent(`Reorder root ${uniqueSuffix}`),
		});
		await orpcClient.nodes.toggleExpanded({ id: root.id, expanded: true });

		const first = await orpcClient.nodes.create({ parentId: root.id });
		await orpcClient.nodes.updateContent({
			id: first.id,
			content: lexicalContent(`Reorder first ${uniqueSuffix}`),
		});
		const second = await orpcClient.nodes.create({
			parentId: root.id,
			afterId: first.id,
		});
		await orpcClient.nodes.updateContent({
			id: second.id,
			content: lexicalContent(`Reorder second ${uniqueSuffix}`),
		});

		const rootSlug = toNodeSlug({
			id: root.id,
			content: lexicalContent(`Reorder root ${uniqueSuffix}`),
		});
		await page.goto(`/${rootSlug}`);

		const persistedOrder = async () => {
			const { rows } = await orpcClient.nodes.visibleTree();
			return buildVisibleTree(rows, root.id, { includeCollapsed: true }).map(
				(r) => r.id,
			);
		};
		await expect.poll(persistedOrder).toEqual([first.id, second.id]);

		// Clicking a row's text starts editing it, which unmounts the read-view
		// handler the reorder shortcut lives on — focus the read-view control
		// directly instead.
		await treeRow(page, `Reorder first ${uniqueSuffix}`)
			.locator("[data-node-focus-target]")
			.focus();
		await page.keyboard.press("Alt+Shift+ArrowDown");

		await expect.poll(persistedOrder).toEqual([second.id, first.id]);

		await treeRow(page, `Reorder first ${uniqueSuffix}`)
			.locator("[data-node-focus-target]")
			.focus();
		await page.keyboard.press("Alt+Shift+ArrowUp");

		await expect.poll(persistedOrder).toEqual([first.id, second.id]);
	} finally {
		await orpcClient.nodes.delete({ id: root.id });
	}
});
