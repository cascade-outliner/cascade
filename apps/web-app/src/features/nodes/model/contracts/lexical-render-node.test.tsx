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

	it("renders a link node as an anchor with the full URL on href and title", () => {
		const link = {
			type: "link",
			url: "https://example.com/some/very/long/path?query=1",
			children: [textNode("example.com/some/very/…")],
		} as never;
		const { container } = render(renderNode(paragraph([link]), 0));
		const anchor = container.querySelector("a");
		expect(anchor?.getAttribute("href")).toBe(
			"https://example.com/some/very/long/path?query=1",
		);
		expect(anchor?.getAttribute("title")).toBe(
			"https://example.com/some/very/long/path?query=1",
		);
		expect(anchor?.textContent).toBe("example.com/some/very/…");
	});

	it("renders a link with a non-http(s) URL as plain text, never an anchor", () => {
		const link = {
			type: "link",
			url: "javascript:alert(1)",
			children: [textNode("click me")],
		} as never;
		const { container } = render(renderNode(paragraph([link]), 0));
		expect(container.querySelector("a")).toBe(null);
		expect(container.textContent).toBe("click me");
	});

	it("renders a link with no url as plain text", () => {
		const link = { type: "link", children: [textNode("label")] } as never;
		const { container } = render(renderNode(paragraph([link]), 0));
		expect(container.querySelector("a")).toBe(null);
		expect(container.textContent).toBe("label");
	});

	it("displays the tidy label for a link whose text is just its URL (typed autolink)", () => {
		const url = "https://www.example.com/some/very/long/path/segment?query=1";
		const link = {
			type: "autolink",
			url,
			children: [textNode(url)],
		} as never;
		const { container } = render(renderNode(paragraph([link]), 0));
		const anchor = container.querySelector("a");
		expect(anchor?.textContent).toBe(
			"example.com/some/very/long/path/segment…",
		);
		expect(anchor?.getAttribute("href")).toBe(url);
	});

	it("renders an unlinked autolink as plain text", () => {
		const link = {
			type: "autolink",
			url: "https://example.com",
			isUnlinked: true,
			children: [textNode("https://example.com")],
		} as never;
		const { container } = render(renderNode(paragraph([link]), 0));
		expect(container.querySelector("a")).toBe(null);
	});

	// Regression test for #415: an empty element rendered with zero children
	// gets no line box at all (0 height), not just no visible glyph, so the
	// row's click target disappears entirely. This happens whenever "Convert
	// into" leaves a block with no children behind, most visibly for headings.
	it("renders a non-breaking space placeholder for an empty paragraph so it keeps a click target", () => {
		const { container } = render(renderNode(paragraph([]), 0));
		const p = container.querySelector("p");
		expect(p?.textContent).toBe(" ");
	});

	it("renders a non-breaking space placeholder for an empty heading so it keeps a click target", () => {
		const heading = { type: "heading", tag: "h1", children: [] } as never;
		const { container } = render(renderNode(heading, 0));
		const h1 = container.querySelector("h1");
		expect(h1?.textContent).toBe(" ");
	});

	it("renders a trailing icon anchor that opens the URL directly", () => {
		const link = {
			type: "link",
			url: "https://example.com/docs",
			children: [textNode("docs")],
		} as never;
		const { container } = render(renderNode(paragraph([link]), 0));
		const anchors = container.querySelectorAll("a");
		expect(anchors).toHaveLength(2);
		const icon = anchors[1];
		expect(icon.getAttribute("href")).toBe("https://example.com/docs");
		expect(icon.getAttribute("target")).toBe("_blank");
		expect(icon.getAttribute("aria-label")).toBe("Open link");
	});
});
