import { describe, expect, it } from "vitest";
import {
	isUuid,
	isUuidFirstBlock,
	slugifyNodeContent,
	splitNodeSlug,
	toNodeSlug,
} from "./node-slug";

function textNode(text: string) {
	return { type: "text", text };
}

function paragraph(children: unknown[]) {
	return { type: "paragraph", children };
}

function root(children: unknown[]) {
	return { type: "root", children };
}

function buildDeeplyNestedContent(levels: number) {
	let node: unknown = textNode("leaf");
	for (let i = 0; i < levels; i++) {
		node = paragraph([node]);
	}
	return { root: root([node]) };
}

describe("slugifyNodeContent", () => {
	it("slugifies plain text content", () => {
		expect(
			slugifyNodeContent({
				root: root([paragraph([textNode("Hello World")])]),
			}),
		).toBe("hello-world");
	});

	it("falls back to 'untitled' for empty content", () => {
		expect(slugifyNodeContent({ root: root([]) })).toBe("untitled");
		expect(slugifyNodeContent(null)).toBe("untitled");
		expect(slugifyNodeContent(undefined)).toBe("untitled");
	});

	// Regression test for the failure scenario in the underlying issue:
	// resolveNodeSlug calls slugifyNodeContent (-> lexicalToPlainText) over
	// stored node content, which used to walk children with no depth guard
	// and threw `RangeError: Maximum call stack size exceeded` on
	// pathologically nested content.
	it("does not throw on pathologically deeply nested content", () => {
		const deeplyNested = buildDeeplyNestedContent(100_000);
		expect(() => slugifyNodeContent(deeplyNested)).not.toThrow();
	});

	it("truncates long content to the max slug length", () => {
		const longText = "word ".repeat(100);
		const slug = slugifyNodeContent({
			root: root([paragraph([textNode(longText)])]),
		});
		expect(slug.length).toBeLessThanOrEqual(64);
	});
});

describe("toNodeSlug / splitNodeSlug round trip", () => {
	it("round-trips a uuid id with slug text", () => {
		const id = "550e8400-e29b-41d4-a716-446655440000";
		const slug = toNodeSlug({
			id,
			content: { root: root([paragraph([textNode("My Node")])]) },
		});
		const { slugId, slugText } = splitNodeSlug(slug);
		expect(slugText).toBe("my-node");
		expect(isUuidFirstBlock(slugId)).toBe(true);
	});

	it("treats a bare uuid as an id-only slug", () => {
		const id = "550e8400-e29b-41d4-a716-446655440000";
		expect(isUuid(id)).toBe(true);
	});
});
