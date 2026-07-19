import { describe, expect, it } from "vitest";
import { contentLinksToNode } from "./node-backlinks";

const targetId = "12345678-1234-4234-9234-123456789abc";

function contentWithUrl(
	type: "link" | "autolink",
	url: string,
	options?: { isUnlinked?: boolean },
) {
	return {
		root: {
			type: "root",
			children: [
				{
					type: "paragraph",
					children: [
						{
							type,
							url,
							isUnlinked: options?.isUnlinked,
							children: [{ type: "text", text: "Mention" }],
						},
					],
				},
			],
		},
	};
}

describe("contentLinksToNode", () => {
	it("matches a node detail URL by compact node id", () => {
		expect(
			contentLinksToNode(
				contentWithUrl("link", "https://app.cascadelist.com/my-node-12345678"),
				targetId,
			),
		).toBe(true);
	});

	it("matches a node detail URL by full uuid", () => {
		expect(
			contentLinksToNode(
				contentWithUrl(
					"link",
					"https://app.cascadelist.com/12345678-1234-4234-9234-123456789abc",
				),
				targetId,
			),
		).toBe(true);
	});

	it("matches autolinks that still resolve to the node", () => {
		expect(
			contentLinksToNode(
				contentWithUrl("autolink", "http://localhost:3001/my-node-12345678"),
				targetId,
			),
		).toBe(true);
	});

	it("ignores unrelated, nested, or explicitly unlinked URLs", () => {
		expect(
			contentLinksToNode(
				contentWithUrl("link", "https://example.com/somewhere-87654321"),
				targetId,
			),
		).toBe(false);
		expect(
			contentLinksToNode(
				contentWithUrl(
					"link",
					"https://app.cascadelist.com/nodes/my-node-12345678",
				),
				targetId,
			),
		).toBe(false);
		expect(
			contentLinksToNode(
				contentWithUrl(
					"autolink",
					"https://app.cascadelist.com/my-node-12345678",
					{
						isUnlinked: true,
					},
				),
				targetId,
			),
		).toBe(false);
	});
});
