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

/** `@tanstack/react-hotkeys`' `Mod` resolves to Meta on macOS, Control elsewhere. */
const modifierKey = process.platform === "darwin" ? "Meta" : "Control";

test("Cmd/Ctrl+K opens Quick Open, searching finds a node, and selecting it navigates there", async ({
	page,
	orpcClient,
}) => {
	const uniqueSuffix = Date.now().toString();
	const title = `Quick open target ${uniqueSuffix}`;
	const node = await orpcClient.nodes.create({ parentId: null });

	try {
		await orpcClient.nodes.updateContent({
			id: node.id,
			content: lexicalContent(title),
		});

		await page.goto("/");
		await page.keyboard.press(`${modifierKey}+k`);

		const searchBox = page.getByRole("combobox", {
			name: "Search node content",
		});
		await expect(searchBox).toBeVisible();
		await searchBox.fill(title);

		const option = page.getByRole("option", { name: new RegExp(uniqueSuffix) });
		await expect(option).toBeVisible();
		await option.click();

		const slug = toNodeSlug({ id: node.id, content: lexicalContent(title) });
		await expect(page).toHaveURL(new RegExp(`/${slug}$`));
		await expect(searchBox).toBeHidden();
	} finally {
		await orpcClient.nodes.delete({ id: node.id });
	}
});

test("Quick Open can be driven entirely from the keyboard: arrow to a result and press Enter", async ({
	page,
	orpcClient,
}) => {
	const uniqueSuffix = Date.now().toString();
	const title = `Quick open keyboard target ${uniqueSuffix}`;
	const node = await orpcClient.nodes.create({ parentId: null });

	try {
		await orpcClient.nodes.updateContent({
			id: node.id,
			content: lexicalContent(title),
		});

		await page.goto("/");
		await page.keyboard.press(`${modifierKey}+k`);

		const searchBox = page.getByRole("combobox", {
			name: "Search node content",
		});
		await searchBox.fill(uniqueSuffix);
		await expect(
			page.getByRole("option", { name: new RegExp(uniqueSuffix) }),
		).toBeVisible();

		await page.keyboard.press("Enter");

		const slug = toNodeSlug({ id: node.id, content: lexicalContent(title) });
		await expect(page).toHaveURL(new RegExp(`/${slug}$`));
	} finally {
		await orpcClient.nodes.delete({ id: node.id });
	}
});
