// @vitest-environment jsdom

import { renderNode } from "@cascade/outliner/lexical/read/lexical-render-node";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
	cleanup();
});

function textNode(text: string) {
	return { type: "text", text } as const;
}

function paragraph(children: unknown[]) {
	return { type: "paragraph", children } as never;
}

function buildDeeplyNested(levels: number) {
	let node: unknown = textNode("leaf");
	for (let i = 0; i < levels; i++) {
		node = paragraph([node]);
	}
	return node as never;
}

describe("renderNode", () => {
	it("renders a normal paragraph/text tree", () => {
		const { container } = render(
			renderNode(paragraph([textNode("hello world")]), 0),
		);
		expect(container.textContent).toBe("hello world");
	});

	// Regression test: renderNode used to recurse with no depth guard, which
	// mirrors the crash lexicalToPlainText had server-side on pathologically
	// nested content read straight from storage.
	it("does not crash or infinitely recurse on pathologically deep content", () => {
		const consoleErrorSpy = vi
			.spyOn(console, "error")
			.mockImplementation(() => {});

		const deeplyNested = buildDeeplyNested(100_000);
		try {
			expect(() => render(renderNode(deeplyNested, 0))).not.toThrow();
		} finally {
			consoleErrorSpy.mockRestore();
		}
	});

	it("stops recursing once the render depth cap is exceeded", () => {
		// One level past the cap should bail out to `null` for that subtree
		// rather than rendering it.
		const deeplyNested = buildDeeplyNested(1000);
		const { container } = render(renderNode(deeplyNested, 0));
		expect(container.textContent).not.toContain("leaf");
	});
});
