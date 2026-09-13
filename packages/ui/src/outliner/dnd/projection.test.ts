import type { OutlineNode } from "@cascade/data";
import { describe, expect, it } from "vitest";
import { flatten } from "../flatten";
import { project } from "./projection";

const text = {} as OutlineNode["text"];
const n = (
	id: string,
	children: OutlineNode[] = [],
	collapsed = false,
): OutlineNode => ({ id, text, children, collapsed });

const tree = [
	n("a", [n("a1"), n("a2")]),
	n("b"),
	n("c", [n("c1")], true),
	n("d"),
];
const rows = flatten(tree);

const at = (overId: string, before: boolean, deltaX = 0, activeDepth = 0) =>
	project({ rows, overId, before, activeDepth, deltaX });

describe("project", () => {
	it("returns null for an unknown row", () => {
		expect(at("nope", true)).toBeNull();
	});

	it("drops between root siblings", () => {
		expect(at("b", true)).toMatchObject({
			parentId: null,
			index: 1,
			depth: 0,
			nesting: false,
		});
		expect(at("b", false)).toMatchObject({ parentId: null, index: 2 });
	});

	it("clamps depth to the row above plus one, nesting under it", () => {
		expect(at("a1", true, 500)).toMatchObject({
			parentId: "a",
			index: 0,
			depth: 1,
			nesting: true,
		});
		expect(at("a2", false, 500)).toMatchObject({
			parentId: "a2",
			index: 0,
			depth: 2,
			nesting: true,
		});
	});

	it("clamps depth to the row below, without nesting under it", () => {
		expect(at("a2", true, -500)).toMatchObject({
			parentId: "a",
			index: 1,
			depth: 1,
			nesting: false,
		});
	});

	it("outdents past the last child back to root", () => {
		expect(at("a2", false, -500)).toMatchObject({
			parentId: null,
			index: 1,
			depth: 0,
			nesting: false,
		});
	});

	it("counts sibling index from visible rows, without nesting under the last one", () => {
		expect(at("a2", false, 0, 1)).toMatchObject({
			parentId: "a",
			index: 2,
			nesting: false,
		});
	});

	it("appends when dropping into a collapsed node, nesting under it", () => {
		expect(at("c", false, 12)).toMatchObject({
			parentId: "c",
			index: 1,
			depth: 1,
			nesting: true,
		});
	});

	it("allows the top and bottom of the list", () => {
		expect(at("a", true, 100)).toMatchObject({
			parentId: null,
			index: 0,
			depth: 0,
			nesting: false,
		});
		expect(at("d", false, 100)).toMatchObject({
			parentId: "d",
			index: 0,
			depth: 1,
			nesting: true,
		});
	});
});
