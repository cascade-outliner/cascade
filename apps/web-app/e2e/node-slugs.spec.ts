import { toNodeSlug } from "@cascade/api/node-slug";
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

test("builds slug URLs from node text and keeps duplicates unique", async ({
	page,
	orpcClient,
}) => {
	const uniqueSuffix = Date.now().toString();
	const parentTitle = `Node slug parent with a very long title that should be truncated for URLs while still being readable ${uniqueSuffix}`;
	const duplicateTitle = `Duplicate node ${uniqueSuffix}`;

	const parent = await orpcClient.nodes.create({ parentId: null });
	let childOne: Awaited<ReturnType<typeof orpcClient.nodes.create>> | null =
		null;
	let childTwo: Awaited<ReturnType<typeof orpcClient.nodes.create>> | null =
		null;

	try {
		await orpcClient.nodes.updateContent({
			id: parent.id,
			content: lexicalContent(parentTitle),
		});

		childOne = await orpcClient.nodes.create({ parentId: parent.id });
		await orpcClient.nodes.updateContent({
			id: childOne.id,
			content: lexicalContent(duplicateTitle),
		});

		childTwo = await orpcClient.nodes.create({ parentId: parent.id });
		await orpcClient.nodes.updateContent({
			id: childTwo.id,
			content: lexicalContent(duplicateTitle),
		});

		const parentSlug = toNodeSlug({
			id: parent.id,
			content: lexicalContent(parentTitle),
		});
		const childSlugOne = toNodeSlug({
			id: childOne.id,
			content: lexicalContent(duplicateTitle),
		});
		const childSlugTwo = toNodeSlug({
			id: childTwo.id,
			content: lexicalContent(duplicateTitle),
		});
		const parentSlugIdPart = parentSlug.split("-").at(-1) ?? "";
		const parentSlugTextPart = parentSlug.slice(
			0,
			parentSlug.length - parentSlugIdPart.length - 1,
		);

		expect(childSlugOne).not.toBe(childSlugTwo);
		expect(parentSlugIdPart.length).toBeLessThan(parent.id.length);
		expect(parentSlugIdPart).toMatch(/^[0-9a-f]{8}$/);
		expect(parentSlugTextPart.length).toBeLessThan(90);

		await page.goto(`/${parentSlug}`);
		await expect(page).toHaveURL(new RegExp(`/${parentSlug}$`));
		await expect(page.locator(`a[href="/${childSlugOne}"]`)).toHaveCount(1);
		await expect(page.locator(`a[href="/${childSlugTwo}"]`)).toHaveCount(1);

		await page.click(`a[href="/${childSlugOne}"]`);
		await expect(page).toHaveURL(new RegExp(`/${childSlugOne}$`));
		await expect(page.getByText(duplicateTitle).first()).toBeVisible();

		await page.goto(`/${childSlugTwo}`);
		await expect(page).toHaveURL(new RegExp(`/${childSlugTwo}$`));
		await expect(page.getByText(duplicateTitle).first()).toBeVisible();
	} finally {
		await orpcClient.nodes.delete({ id: parent.id });
	}
});
