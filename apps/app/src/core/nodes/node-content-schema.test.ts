import { describe, expect, it } from "vitest";
import {
	MAX_CHILDREN_PER_NODE,
	MAX_LEXICAL_DEPTH,
	MAX_TEXT_LENGTH,
	updateNodeContentInputSchema,
} from "@/core/nodes/node-content-schema";

function textNode(text: string) {
	return {
		type: "text",
		version: 1,
		text,
		format: 0,
		detail: 0,
		mode: "normal",
		style: "",
	};
}

function paragraph(children: unknown[]) {
	return {
		type: "paragraph",
		version: 1,
		direction: "ltr" as const,
		format: "",
		indent: 0,
		children,
	};
}

function root(children: unknown[]) {
	return {
		type: "root",
		version: 1,
		direction: "ltr" as const,
		format: "",
		indent: 0,
		children,
	};
}

function buildInput(rootNode: unknown) {
	return { id: "some-id", content: { root: rootNode } };
}

function buildDeeplyNested(levels: number) {
	let node: unknown = textNode("leaf");
	for (let i = 0; i < levels; i++) {
		node = paragraph([node]);
	}
	return node;
}

describe("updateNodeContentInputSchema", () => {
	it("accepts realistic paragraph/text content", () => {
		const result = updateNodeContentInputSchema.safeParse(
			buildInput(root([paragraph([textNode("hello world")])])),
		);
		expect(result.success).toBe(true);
	});

	it("accepts content right at the depth limit", () => {
		// root (depth 0) + MAX_LEXICAL_DEPTH nested paragraphs still fits.
		const nested = buildDeeplyNested(MAX_LEXICAL_DEPTH - 1);
		const result = updateNodeContentInputSchema.safeParse(
			buildInput(root([nested])),
		);
		expect(result.success).toBe(true);
	});

	it("rejects content nested far beyond the depth limit", () => {
		const nested = buildDeeplyNested(1000);
		const result = updateNodeContentInputSchema.safeParse(
			buildInput(root([nested])),
		);
		expect(result.success).toBe(false);
	});

	it("accepts a node with exactly the max number of children", () => {
		const children = Array.from({ length: MAX_CHILDREN_PER_NODE }, (_, i) =>
			paragraph([textNode(`child ${i}`)]),
		);
		const result = updateNodeContentInputSchema.safeParse(
			buildInput(root(children)),
		);
		expect(result.success).toBe(true);
	});

	it("rejects a node with more than the max number of children", () => {
		const children = Array.from({ length: MAX_CHILDREN_PER_NODE + 1 }, (_, i) =>
			paragraph([textNode(`child ${i}`)]),
		);
		const result = updateNodeContentInputSchema.safeParse(
			buildInput(root(children)),
		);
		expect(result.success).toBe(false);
	});

	it("accepts text right at the max length", () => {
		const result = updateNodeContentInputSchema.safeParse(
			buildInput(root([paragraph([textNode("x".repeat(MAX_TEXT_LENGTH))])])),
		);
		expect(result.success).toBe(true);
	});

	it("rejects text longer than the max length", () => {
		const result = updateNodeContentInputSchema.safeParse(
			buildInput(
				root([paragraph([textNode("x".repeat(MAX_TEXT_LENGTH + 1))])]),
			),
		);
		expect(result.success).toBe(false);
	});

	it("rejects an overall payload larger than the byte cap even when every individual node is within its own limits", () => {
		const children = Array.from({ length: MAX_CHILDREN_PER_NODE }, () =>
			paragraph([textNode("x".repeat(1000))]),
		);
		const result = updateNodeContentInputSchema.safeParse(
			buildInput(root(children)),
		);
		expect(result.success).toBe(false);
	});

	it("rejects unknown keys instead of silently persisting them", () => {
		const result = updateNodeContentInputSchema.safeParse(
			buildInput(
				root([
					paragraph([{ ...textNode("hi"), evilPayload: "x".repeat(100) }]),
				]),
			),
		);
		expect(result.success).toBe(false);
	});

	it("rejects content missing the required root type", () => {
		const result = updateNodeContentInputSchema.safeParse({
			id: "some-id",
			content: { root: { children: [] } },
		});
		expect(result.success).toBe(false);
	});
});
