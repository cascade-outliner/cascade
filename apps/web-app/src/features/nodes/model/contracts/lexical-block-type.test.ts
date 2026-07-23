import { getBlockType, setBlockType } from "@cascade/outliner/lexical-content";
import { describe, expect, it } from "vitest";

function textNode(text: string) {
	return { type: "text", text };
}

function paragraph(children: unknown[]) {
	return { type: "paragraph", children };
}

function heading(tag: string, children: unknown[]) {
	return { type: "heading", tag, children };
}

function root(children: unknown[]) {
	return { root: { type: "root", children } };
}

describe("getBlockType", () => {
	it("returns paragraph for paragraph content", () => {
		expect(getBlockType(root([paragraph([textNode("hello")])]))).toBe(
			"paragraph",
		);
	});

	it("returns the heading tag for heading content", () => {
		expect(getBlockType(root([heading("h2", [textNode("Title")])]))).toBe("h2");
	});

	it("defaults to paragraph for null/empty/malformed content", () => {
		expect(getBlockType(null)).toBe("paragraph");
		expect(getBlockType(undefined)).toBe("paragraph");
		expect(getBlockType({})).toBe("paragraph");
		expect(getBlockType(root([]))).toBe("paragraph");
	});
});

describe("setBlockType", () => {
	it("converts a paragraph into a heading, preserving its children", () => {
		const content = root([paragraph([textNode("hello world")])]);
		const result = setBlockType(content, "h2");
		expect(result.root.children?.[0]).toMatchObject({
			type: "heading",
			tag: "h2",
			children: [textNode("hello world")],
		});
	});

	it("converts a heading back into a paragraph, dropping the tag", () => {
		const content = root([heading("h3", [textNode("Title")])]);
		const result = setBlockType(content, "paragraph");
		const [child] = result.root.children ?? [];
		expect(child).toMatchObject({
			type: "paragraph",
			children: [textNode("Title")],
		});
		expect(child).not.toHaveProperty("tag");
	});

	it("converting a heading to itself is a no-op", () => {
		const content = root([heading("h1", [textNode("Title")])]);
		const result = setBlockType(content, "h1");
		expect(result.root.children?.[0]).toMatchObject({
			type: "heading",
			tag: "h1",
			children: [textNode("Title")],
		});
	});

	it("synthesizes a minimal block for null content", () => {
		const result = setBlockType(null, "h1");
		expect(result.root.children?.[0]).toMatchObject({
			type: "heading",
			tag: "h1",
			children: [],
		});
	});
});
