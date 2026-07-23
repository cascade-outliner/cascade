import { lexicalToPlainText } from "@cascade/outliner/lexical-content";
import { describe, expect, it } from "vitest";

function textNode(text: string) {
	return { type: "text", text };
}

function paragraph(children: unknown[]) {
	return { type: "paragraph", children };
}

function root(children: unknown[]) {
	return { root: { type: "root", children } };
}

function buildDeeplyNested(levels: number) {
	let node: unknown = textNode("leaf");
	for (let i = 0; i < levels; i++) {
		node = paragraph([node]);
	}
	return { root: node };
}

describe("lexicalToPlainText", () => {
	it("extracts plain text from paragraph/text nodes", () => {
		expect(
			lexicalToPlainText(root([paragraph([textNode("hello world")])])),
		).toBe("hello world");
	});

	it("returns an empty string for null/malformed content", () => {
		expect(lexicalToPlainText(null)).toBe("");
		expect(lexicalToPlainText(undefined)).toBe("");
		expect(lexicalToPlainText({})).toBe("");
	});

	it("respects the character limit", () => {
		const longText = "word ".repeat(1000);
		const result = lexicalToPlainText(
			root([paragraph([textNode(longText)])]),
			50,
		);
		expect(result.length).toBeLessThanOrEqual(50);
	});

	// Regression test for the RangeError this used to throw server-side (in
	// resolveNodeSlug, via slugifyNodeContent) on pathologically nested
	// content that the old unbounded write-side schema allowed to persist.
	it("does not throw on pathologically deep content", () => {
		const deeplyNested = buildDeeplyNested(100_000);
		expect(() => lexicalToPlainText(deeplyNested)).not.toThrow();
	});

	it("stops walking past the depth cap instead of collecting deeply nested text", () => {
		const deeplyNested = buildDeeplyNested(1000);
		expect(lexicalToPlainText(deeplyNested)).not.toContain("leaf");
	});
});
