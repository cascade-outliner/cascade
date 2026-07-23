import { describe, expect, it } from "vitest";
import { demoAllNodes } from "../data/demo-tree-seed";
import { getDemoTreeAncestors, getVisibleDemoRows } from "./demo-tree-queries";

describe("getVisibleDemoRows", () => {
	it("omits descendants of collapsed rows", () => {
		const visibleIds = getVisibleDemoRows(demoAllNodes, null).map(
			(row) => row.id,
		);

		expect(visibleIds).toContain("ideas-1");
		expect(visibleIds).not.toContain("ideas-1-1");
		expect(visibleIds).not.toContain("ideas-1-2");
		expect(visibleIds).toContain("ideas-2");
	});

	it("re-bases descendants when a node becomes the root", () => {
		const rows = getVisibleDemoRows(demoAllNodes, "plan");

		expect(rows.map(({ id, depth }) => ({ id, depth }))).toEqual([
			{ id: "plan-1", depth: 0 },
			{ id: "plan-2", depth: 0 },
			{ id: "plan-3", depth: 0 },
		]);
	});
});

describe("getDemoTreeAncestors", () => {
	it("returns ancestors from the top down", () => {
		expect(
			getDemoTreeAncestors(demoAllNodes, "ideas-1-1", "Untitled").map(
				({ id }) => id,
			),
		).toEqual(["ideas", "ideas-1", "ideas-1-1"]);
	});
});
