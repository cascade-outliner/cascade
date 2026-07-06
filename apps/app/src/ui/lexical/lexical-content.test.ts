import { describe, expect, test } from "vitest";
import {
	lexicalToPlainText,
	toLexicalContent,
} from "@/ui/lexical/lexical-content";

function textNode(text: string) {
	return { type: "text", text };
}

function paragraph(children: unknown[]) {
	return { type: "paragraph", children };
}

function doc(children: unknown[]) {
	return { root: { type: "root", children } };
}

describe("lexicalToPlainText", () => {
	test("extracts plain text from a single paragraph", () => {
		const content = doc([paragraph([textNode("hello world")])]);
		expect(lexicalToPlainText(content)).toBe("hello world");
	});

	test("joins multiple formatted text runs within a paragraph", () => {
		const content = doc([
			paragraph([textNode("bold"), textNode(" "), textNode("italic")]),
		]);
		expect(lexicalToPlainText(content)).toBe("bold italic");
	});

	test("walks nested elements", () => {
		const content = doc([
			paragraph([
				{
					type: "list",
					children: [paragraph([textNode("nested item")])],
				},
			]),
		]);
		expect(lexicalToPlainText(content)).toBe("nested item");
	});

	test("returns empty string for null content", () => {
		expect(lexicalToPlainText(null)).toBe("");
	});

	test("returns empty string for malformed content", () => {
		expect(lexicalToPlainText({ notRoot: true })).toBe("");
		expect(lexicalToPlainText("a string")).toBe("");
		expect(lexicalToPlainText(undefined)).toBe("");
	});

	test("truncates at the given limit", () => {
		const content = doc([paragraph([textNode("a".repeat(50))])]);
		expect(lexicalToPlainText(content, 10)).toHaveLength(10);
	});

	test("respects a larger limit for indexing than the default breadcrumb limit", () => {
		const longText = "word ".repeat(100).trim();
		const content = doc([paragraph([textNode(longText)])]);
		expect(lexicalToPlainText(content).length).toBeLessThan(longText.length);
		expect(lexicalToPlainText(content, 10_000)).toBe(longText);
	});
});

describe("toLexicalContent", () => {
	test("narrows valid content", () => {
		const content = doc([paragraph([textNode("hi")])]);
		expect(toLexicalContent(content)).toEqual(content);
	});

	test("rejects content without a root", () => {
		expect(toLexicalContent({ foo: "bar" })).toBeNull();
		expect(toLexicalContent(null)).toBeNull();
		expect(toLexicalContent("string")).toBeNull();
	});
});
