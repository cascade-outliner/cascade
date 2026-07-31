import { describe, expect, it } from "vitest";
import type { FlatNodeRow } from "../../nodes/model/node-types";
import { buildVisibleTree } from "./build-visible-tree";

function row(
	id: string,
	parentId: string | null,
	order: string,
	overrides: Partial<FlatNodeRow> = {},
): FlatNodeRow {
	return {
		id,
		parentId,
		content: null,
		type: "text",
		metadata: null,
		expanded: true,
		order,
		dueDate: null,
		recurrence: null,
		icon: null,
		tags: [],
		...overrides,
	};
}

describe("buildVisibleTree", () => {
	it("walks depth-first, sorting siblings by order", () => {
		const rows = [
			row("root", null, "a0"),
			row("c2", "root", "b0"),
			row("c1", "root", "a0"),
			row("grandchild", "c1", "a0"),
		];

		const result = buildVisibleTree(rows, null);

		expect(result.map((r) => r.id)).toEqual(["root", "c1", "grandchild", "c2"]);
		expect(result[0]).toMatchObject({
			depth: 0,
			path: ["a0"],
			hasChildren: true,
			isLastChild: true,
		});
		expect(result[1]).toMatchObject({ depth: 1, hasChildren: true });
		expect(result[2]).toMatchObject({ depth: 2, hasChildren: false });
	});

	it("hides descendants of collapsed nodes by default", () => {
		const rows = [
			row("root", null, "a0", { expanded: false }),
			row("child", "root", "a0"),
		];

		expect(buildVisibleTree(rows, null).map((r) => r.id)).toEqual(["root"]);
	});

	it("includes collapsed descendants when includeCollapsed is set", () => {
		const rows = [
			row("root", null, "a0", { expanded: false }),
			row("child", "root", "a0"),
		];

		expect(
			buildVisibleTree(rows, null, { includeCollapsed: true }).map((r) => r.id),
		).toEqual(["root", "child"]);
	});

	it("scopes to a rootId's subtree, resetting depth to 0", () => {
		const rows = [
			row("root", null, "a0"),
			row("child", "root", "a0"),
			row("grandchild", "child", "a0"),
			row("other-root", null, "b0"),
		];

		const result = buildVisibleTree(rows, "root");

		expect(result.map((r) => r.id)).toEqual(["child", "grandchild"]);
		expect(result[0].depth).toBe(0);
		expect(result[1].depth).toBe(1);
	});

	it("marks isLastChild for the final sibling in each group", () => {
		const rows = [
			row("a", null, "a0"),
			row("b", null, "b0"),
			row("c", null, "c0"),
		];

		const result = buildVisibleTree(rows, null);
		expect(result.map((r) => r.isLastChild)).toEqual([false, false, true]);
	});
});
