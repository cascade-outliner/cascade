import { toNodeSlug } from "@/features/nodes/model/node-slug";
import { expect, test } from "./support/fixtures";

const paragraph = (text: string) => ({
	root: {
		type: "root",
		children: [{ type: "paragraph", children: [{ type: "text", text }] }],
	},
});

async function streamToString(stream: NodeJS.ReadableStream): Promise<string> {
	const chunks: Buffer[] = [];
	for await (const chunk of stream) {
		chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
	}
	return Buffer.concat(chunks).toString("utf-8");
}

test("exports a node's subtree to Markdown from its context menu", async ({
	page,
	orpcClient,
}) => {
	const uniqueSuffix = Date.now().toString();
	const rootTitle = `Export root ${uniqueSuffix}`;
	const childTitle = `Export child ${uniqueSuffix}`;
	const grandchildTitle = `Export grandchild ${uniqueSuffix}`;

	const root = await orpcClient.nodes.create({ parentId: null });
	try {
		await orpcClient.nodes.updateContent({
			id: root.id,
			content: paragraph(rootTitle),
		});
		const child = await orpcClient.nodes.create({ parentId: root.id });
		await orpcClient.nodes.updateContent({
			id: child.id,
			content: paragraph(childTitle),
		});
		await orpcClient.nodes.toggleExpanded({ id: child.id, expanded: true });
		const grandchild = await orpcClient.nodes.create({ parentId: child.id });
		await orpcClient.nodes.updateContent({
			id: grandchild.id,
			content: paragraph(grandchildTitle),
		});

		const slug = toNodeSlug({ id: root.id, content: paragraph(rootTitle) });
		await page.goto(`/${slug}`);

		const row = page.getByRole("treeitem").filter({ hasText: childTitle });
		await row.click({ button: "right" });
		await page.getByRole("menuitem", { name: "Export" }).click();

		const downloadPromise = page.waitForEvent("download");
		await page.getByRole("menuitem", { name: "Markdown" }).click();
		const download = await downloadPromise;

		expect(download.suggestedFilename()).toBe("cascade-export.md");
		const stream = await download.createReadStream();
		expect(await streamToString(stream)).toBe(
			`- ${childTitle}\n  - ${grandchildTitle}`,
		);
	} finally {
		await orpcClient.nodes.delete({ id: root.id });
	}
});

test("exports the whole tree to OPML from the user menu", async ({
	page,
	orpcClient,
}) => {
	const uniqueSuffix = Date.now().toString();
	const rootTitle = `OPML export root ${uniqueSuffix}`;

	const root = await orpcClient.nodes.create({ parentId: null });
	try {
		await orpcClient.nodes.updateContent({
			id: root.id,
			content: paragraph(rootTitle),
		});

		await page.goto("/");
		await page.getByRole("button", { name: "User menu" }).click();

		const downloadPromise = page.waitForEvent("download");
		await page.getByRole("menuitem", { name: "Export tree as OPML" }).click();
		const download = await downloadPromise;

		expect(download.suggestedFilename()).toBe("cascade-export.opml");
		const stream = await download.createReadStream();
		const content = await streamToString(stream);
		expect(content).toContain(`<outline text="${rootTitle}" />`);
	} finally {
		await orpcClient.nodes.delete({ id: root.id });
	}
});
