import { randomUUID } from "node:crypto";
import { expect, test } from "./support/fixtures";

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

test("tree history restores an edit and a deleted node across reloads", async ({
	page,
	orpcClient,
}) => {
	const runId = randomUUID();
	const firstVersion = `first version ${runId}`;
	const secondVersion = `second version ${runId}`;
	const deletedTitle = `deleted child ${runId}`;
	const before = await orpcClient.premium.get();
	if (!before.isPremium) await orpcClient.premium.requestSeat();
	const scratchNode = await orpcClient.nodes.create({ parentId: null });

	try {
		const edited = await orpcClient.nodes.create({
			parentId: scratchNode.id,
		});
		await orpcClient.nodes.updateContent({
			id: edited.id,
			content: content(firstVersion),
		});
		await orpcClient.nodes.updateContent({
			id: edited.id,
			content: content(secondVersion),
		});

		const deleted = await orpcClient.nodes.create({
			parentId: scratchNode.id,
		});
		await orpcClient.nodes.updateContent({
			id: deleted.id,
			content: content(deletedTitle),
		});
		await orpcClient.nodes.delete({ id: deleted.id });

		await page.goto("/");
		await page.getByRole("button", { name: "User menu" }).click();
		await page.getByRole("menuitem", { name: "Tree history" }).click();

		await page
			.getByRole("button", {
				name: new RegExp(`Edited content · ${secondVersion}`),
			})
			.click();
		const detail = page.getByTestId("tree-history-detail");
		await expect(
			detail.getByText(secondVersion, { exact: true }),
		).toBeVisible();
		await detail.getByRole("button", { name: "Restore" }).click();
		await expect
			.poll(async () => (await orpcClient.nodes.get({ id: edited.id })).content)
			.toEqual(content(firstVersion));

		await page
			.getByRole("button", {
				name: new RegExp(`Deleted · ${deletedTitle}`),
			})
			.click();
		await expect(detail.getByText(deletedTitle, { exact: true })).toBeVisible();
		await detail.getByRole("button", { name: "Restore" }).click();
		await expect
			.poll(async () =>
				(await orpcClient.nodes.list({ parentId: scratchNode.id })).some(
					({ id }) => id === deleted.id,
				),
			)
			.toBe(true);

		await page.reload();
		const children = await orpcClient.nodes.list({
			parentId: scratchNode.id,
		});
		expect(children.map(({ id }) => id)).toContain(deleted.id);
	} finally {
		await orpcClient.nodes.delete({ id: scratchNode.id });
		if (!before.isPremium) await orpcClient.premium.revokeSeat();
	}
});
