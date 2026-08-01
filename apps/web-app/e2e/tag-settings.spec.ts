import { toNodeSlug } from "@/features/nodes/model/node-slug";
import { expect, test } from "./support/fixtures";

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

// Tag CRUD acts on the shared e2e account's global tag list, so these tests
// must not run concurrently with each other.
test.describe.configure({ mode: "serial" });

test("creates a tag from Settings and it becomes assignable on a node", async ({
	page,
	orpcClient,
}) => {
	const uniqueSuffix = Date.now().toString();
	const tagName = `e2e-create-tag-${uniqueSuffix}`;
	const node = await orpcClient.nodes.create({ parentId: null });

	try {
		await orpcClient.nodes.updateContent({
			id: node.id,
			content: lexicalContent(`Tag CRUD scratch node ${uniqueSuffix}`),
		});

		await page.goto("/");
		await page.getByRole("button", { name: "User menu" }).click();
		await page.getByRole("menuitem", { name: "Settings" }).click();
		await page.getByRole("tab", { name: "Tags" }).click();

		await page.getByPlaceholder("Tag name").fill(tagName);
		await page.getByRole("button", { name: "Create tag" }).click();

		await expect(
			page.getByRole("listitem").filter({ hasText: tagName }),
		).toBeVisible();
		await expect
			.poll(async () => (await orpcClient.nodes.listTags()).map((t) => t.name))
			.toContain(tagName);

		await page.getByRole("button", { name: "Close settings" }).click();

		// The new tag is immediately usable from a node's own tag picker.
		const slug = toNodeSlug({
			id: node.id,
			content: lexicalContent(`Tag CRUD scratch node ${uniqueSuffix}`),
		});
		await page.goto(`/${slug}`);
		await page.getByRole("button", { name: "Add tag" }).click();
		await page.getByRole("combobox").fill(tagName);
		await page.getByRole("button", { name: new RegExp(`^${tagName}`) }).click();
		await page.keyboard.press("Escape");

		await expect
			.poll(async () => (await orpcClient.nodes.get({ id: node.id })).tags)
			.toEqual([tagName]);
	} finally {
		await orpcClient.nodes.deleteTag({ name: tagName }).catch(() => {});
		await orpcClient.nodes.delete({ id: node.id });
	}
});

test("renames a tag from Settings and the new name applies to nodes using it", async ({
	page,
	orpcClient,
}) => {
	const uniqueSuffix = Date.now().toString();
	const originalName = `e2e-rename-before-${uniqueSuffix}`;
	const newName = `e2e-rename-after-${uniqueSuffix}`;
	const node = await orpcClient.nodes.create({ parentId: null });

	try {
		await orpcClient.nodes.setTags({ id: node.id, tags: [originalName] });

		await page.goto("/");
		await page.getByRole("button", { name: "User menu" }).click();
		await page.getByRole("menuitem", { name: "Settings" }).click();
		await page.getByRole("tab", { name: "Tags" }).click();

		// Once a row enters edit mode its rendered text no longer contains the
		// tag name (it moves into the textbox's `value`, which `hasText`
		// doesn't see), so re-scope to page-level locators for the edit form
		// rather than continuing to filter the row by its old text.
		await page
			.getByRole("listitem")
			.filter({ hasText: originalName })
			.getByRole("button", { name: `Edit ${originalName}` })
			.click();
		await page
			.getByRole("list")
			.getByRole("textbox", { name: "Tag name" })
			.fill(newName);
		await page.getByRole("button", { name: "Save" }).click();

		await expect(
			page.getByRole("listitem").filter({ hasText: newName }),
		).toBeVisible();
		await expect
			.poll(async () => (await orpcClient.nodes.get({ id: node.id })).tags)
			.toEqual([newName]);
	} finally {
		await orpcClient.nodes.deleteTag({ name: newName }).catch(() => {});
		await orpcClient.nodes.deleteTag({ name: originalName }).catch(() => {});
		await orpcClient.nodes.delete({ id: node.id });
	}
});

test("deletes a tag from Settings after confirming, removing it from nodes that used it", async ({
	page,
	orpcClient,
}) => {
	const uniqueSuffix = Date.now().toString();
	const tagName = `e2e-delete-tag-${uniqueSuffix}`;
	const node = await orpcClient.nodes.create({ parentId: null });

	try {
		await orpcClient.nodes.setTags({ id: node.id, tags: [tagName] });

		await page.goto("/");
		await page.getByRole("button", { name: "User menu" }).click();
		await page.getByRole("menuitem", { name: "Settings" }).click();
		await page.getByRole("tab", { name: "Tags" }).click();

		const row = page.getByRole("listitem").filter({ hasText: tagName });
		await expect(row.getByText("Used on 1 node")).toBeVisible();
		await row.getByRole("button", { name: `Delete ${tagName}` }).click();

		await expect(
			page.getByRole("heading", { name: "Delete tag?" }),
		).toBeVisible();
		await page.getByRole("button", { name: "Delete tag", exact: true }).click();

		await expect(
			page.getByRole("listitem").filter({ hasText: tagName }),
		).toHaveCount(0);
		await expect
			.poll(async () => (await orpcClient.nodes.listTags()).map((t) => t.name))
			.not.toContain(tagName);
		await expect
			.poll(async () => (await orpcClient.nodes.get({ id: node.id })).tags)
			.toEqual([]);
	} finally {
		await orpcClient.nodes.deleteTag({ name: tagName }).catch(() => {});
		await orpcClient.nodes.delete({ id: node.id });
	}
});
