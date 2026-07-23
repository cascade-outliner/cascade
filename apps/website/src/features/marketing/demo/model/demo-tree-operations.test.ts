import { describe, expect, it } from "vitest";
import { demoAllNodes } from "../data/demo-tree-seed";
import { createDemoRow, duplicateDemoSubtree } from "./demo-tree-operations";

describe("createDemoRow", () => {
	it("creates a blank text row with the supplied placement", () => {
		const row = createDemoRow(
			{ parentId: "parent", depth: 2, isLastChild: true },
			() => "generated-id",
		);

		expect(row).toMatchObject({
			id: "generated-id",
			order: "generated-id",
			parentId: "parent",
			depth: 2,
			isLastChild: true,
			type: "text",
			content: null,
		});
	});
});

describe("duplicateDemoSubtree", () => {
	it("duplicates a subtree and remaps descendant parent IDs", () => {
		const ids = ["copy-root", "copy-child-1", "copy-child-2"];
		const duplicated = duplicateDemoSubtree(
			demoAllNodes,
			"ideas-1",
			() => ids.shift() ?? "unexpected",
		);
		const rootIndex = duplicated.findIndex(({ id }) => id === "copy-root");

		expect(duplicated.slice(rootIndex, rootIndex + 3)).toMatchObject([
			{ id: "copy-root", parentId: "ideas" },
			{ id: "copy-child-1", parentId: "copy-root" },
			{ id: "copy-child-2", parentId: "copy-root" },
		]);
	});

	it("returns the original array when the source row does not exist", () => {
		expect(duplicateDemoSubtree(demoAllNodes, "missing")).toBe(demoAllNodes);
	});
});
