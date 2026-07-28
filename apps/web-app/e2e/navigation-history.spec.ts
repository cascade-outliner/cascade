import { toNodeSlug } from "@/features/nodes/model/node-slug";
import { expect, test } from "./support/fixtures";

const lexicalContent = (text: string) => ({
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

test("steps back and forward through visited nodes without fighting the browser", async ({
	page,
	orpcClient,
}) => {
	const uniqueSuffix = Date.now().toString();
	const parentTitle = `Navigation history parent ${uniqueSuffix}`;
	const firstTitle = `Navigation history first child ${uniqueSuffix}`;
	const secondTitle = `Navigation history second child ${uniqueSuffix}`;

	const parent = await orpcClient.nodes.create({ parentId: null });

	try {
		await orpcClient.nodes.updateContent({
			id: parent.id,
			content: lexicalContent(parentTitle),
		});

		const first = await orpcClient.nodes.create({ parentId: parent.id });
		await orpcClient.nodes.updateContent({
			id: first.id,
			content: lexicalContent(firstTitle),
		});

		const second = await orpcClient.nodes.create({ parentId: parent.id });
		await orpcClient.nodes.updateContent({
			id: second.id,
			content: lexicalContent(secondTitle),
		});

		const parentSlug = toNodeSlug({
			id: parent.id,
			content: lexicalContent(parentTitle),
		});
		const firstSlug = toNodeSlug({
			id: first.id,
			content: lexicalContent(firstTitle),
		});
		const secondSlug = toNodeSlug({
			id: second.id,
			content: lexicalContent(secondTitle),
		});

		const back = page.getByRole("button", {
			name: "Go back to the previously visited node",
		});
		const forward = page.getByRole("button", {
			name: "Go forward to the next visited node",
		});

		// The stack is session-local, so it starts empty on a fresh page load.
		await page.goto(`/${parentSlug}`);
		await expect(back).toBeDisabled();
		await expect(forward).toBeDisabled();

		await page.click(`a[href="/${firstSlug}"]`);
		await expect(page).toHaveURL(new RegExp(`/${firstSlug}$`));
		await expect(back).toBeEnabled();
		await expect(forward).toBeDisabled();

		await back.click();
		await expect(page).toHaveURL(new RegExp(`/${parentSlug}$`));
		await expect(forward).toBeEnabled();

		await forward.click();
		await expect(page).toHaveURL(new RegExp(`/${firstSlug}$`));
		await expect(forward).toBeDisabled();

		// The browser's own back button moves our cursor rather than pushing, so
		// the forward entry survives and stepping forward again still works.
		await page.goBack();
		await expect(page).toHaveURL(new RegExp(`/${parentSlug}$`));
		await expect(forward).toBeEnabled();

		await forward.click();
		await expect(page).toHaveURL(new RegExp(`/${firstSlug}$`));

		// Navigating somewhere new after stepping back drops the forward entries.
		await back.click();
		await expect(page).toHaveURL(new RegExp(`/${parentSlug}$`));
		await page.click(`a[href="/${secondSlug}"]`);
		await expect(page).toHaveURL(new RegExp(`/${secondSlug}$`));
		await expect(forward).toBeDisabled();
		await expect(back).toBeEnabled();

		// The keyboard shortcuts drive the same stack.
		await page.keyboard.press("Alt+ArrowLeft");
		await expect(page).toHaveURL(new RegExp(`/${parentSlug}$`));
		await page.keyboard.press("Alt+ArrowRight");
		await expect(page).toHaveURL(new RegExp(`/${secondSlug}$`));
	} finally {
		await orpcClient.nodes.delete({ id: parent.id });
	}
});

test("keeps the controls mounted and the stack in sync when a step lands on a deleted node (#486)", async ({
	page,
	orpcClient,
}) => {
	const uniqueSuffix = Date.now().toString();
	const rootTitle = `Navigation history root ${uniqueSuffix}`;
	const middleTitle = `Navigation history middle ${uniqueSuffix}`;
	const leafTitle = `Navigation history leaf ${uniqueSuffix}`;

	const root = await orpcClient.nodes.create({ parentId: null });

	try {
		await orpcClient.nodes.updateContent({
			id: root.id,
			content: lexicalContent(rootTitle),
		});

		const middle = await orpcClient.nodes.create({ parentId: root.id });
		await orpcClient.nodes.updateContent({
			id: middle.id,
			content: lexicalContent(middleTitle),
		});

		const leaf = await orpcClient.nodes.create({ parentId: middle.id });
		await orpcClient.nodes.updateContent({
			id: leaf.id,
			content: lexicalContent(leafTitle),
		});

		const rootSlug = toNodeSlug({
			id: root.id,
			content: lexicalContent(rootTitle),
		});
		const middleSlug = toNodeSlug({
			id: middle.id,
			content: lexicalContent(middleTitle),
		});
		const leafSlug = toNodeSlug({
			id: leaf.id,
			content: lexicalContent(leafTitle),
		});

		const back = page.getByRole("button", {
			name: "Go back to the previously visited node",
		});

		// Build up a stack of [root, middle, leaf] with the cursor at leaf.
		await page.goto(`/${rootSlug}`);
		await page.click(`a[href="/${middleSlug}"]`);
		await expect(page).toHaveURL(new RegExp(`/${middleSlug}$`));
		await page.click(`a[href="/${leafSlug}"]`);
		await expect(page).toHaveURL(new RegExp(`/${leafSlug}$`));

		// The middle node is deleted after being recorded in the stack.
		await orpcClient.nodes.delete({ id: middle.id });

		// Stepping back lands on the now-deleted node's slug, which 404s into
		// the generic error page. The controls must still be there...
		await back.click();
		await expect(page).toHaveURL(new RegExp(`/${middleSlug}$`));
		await expect(back).toBeVisible();
		await expect(back).toBeEnabled();

		// ...and the stack must keep tracking the router's actual location, so
		// stepping back again continues past the errored entry to root instead
		// of being stuck replaying it.
		await back.click();
		await expect(page).toHaveURL(new RegExp(`/${rootSlug}$`));
	} finally {
		await orpcClient.nodes.delete({ id: root.id });
	}
});
