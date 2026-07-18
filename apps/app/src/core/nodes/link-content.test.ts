import {
	linkTextContent,
	updateLinkInContent,
} from "@cascade/outliner/lexical/link-content";
import type { LexicalElementNode } from "@cascade/outliner/lexical/read/lexical-read-view";
import { describe, expect, it } from "vitest";

function textNode(text: string) {
	return {
		type: "text" as const,
		text,
		format: 1,
	};
}

function linkNode(url: string, label: string) {
	return {
		type: "link",
		url,
		children: [textNode(label)],
	};
}

function content(children: unknown[]): { root: LexicalElementNode } {
	return {
		root: {
			type: "root",
			children: [{ type: "paragraph", children }],
		} as LexicalElementNode,
	};
}

describe("linkTextContent", () => {
	it("concatenates the text children", () => {
		expect(
			linkTextContent({
				type: "link",
				children: [textNode("a"), textNode("b")],
			} as LexicalElementNode),
		).toBe("ab");
	});
});

describe("updateLinkInContent", () => {
	it("updates the url and label of the link at the given path", () => {
		const before = content([
			textNode("see "),
			linkNode("https://example.com/old", "example.com/old"),
		]);
		const after = updateLinkInContent(before, [0, 1], {
			text: "docs",
			url: "https://example.com/new",
		});
		expect(after).not.toBe(null);
		const paragraph = after?.root.children?.[0] as LexicalElementNode;
		const link = paragraph.children?.[1] as {
			url?: string;
			children?: { text?: string; format?: number }[];
		};
		expect(link.url).toBe("https://example.com/new");
		expect(link.children).toHaveLength(1);
		expect(link.children?.[0].text).toBe("docs");
		// The original text child's formatting fields carry over.
		expect(link.children?.[0].format).toBe(1);
	});

	it("does not mutate the original content", () => {
		const before = content([linkNode("https://example.com", "example.com")]);
		const snapshot = structuredClone(before);
		updateLinkInContent(before, [0, 0], {
			text: "x",
			url: "https://example.com/x",
		});
		expect(before).toEqual(snapshot);
	});

	it("returns null when the path does not resolve", () => {
		const before = content([linkNode("https://example.com", "example.com")]);
		expect(
			updateLinkInContent(before, [0, 5], {
				text: "x",
				url: "https://example.com/x",
			}),
		).toBe(null);
	});

	it("converts an autolink into a manual link so the editor can't rewrite the custom label", () => {
		const before = content([
			{
				type: "autolink",
				url: "https://example.com/typed",
				isUnlinked: false,
				children: [textNode("https://example.com/typed")],
			},
		]);
		const after = updateLinkInContent(before, [0, 0], {
			text: "typed docs",
			url: "https://example.com/typed",
		});
		const paragraph = after?.root.children?.[0] as LexicalElementNode;
		const link = paragraph.children?.[0] as {
			type?: string;
			isUnlinked?: boolean;
		};
		expect(link.type).toBe("link");
		expect("isUnlinked" in link).toBe(false);
	});

	it("returns null when the path points at a non-link node", () => {
		const before = content([textNode("plain")]);
		expect(
			updateLinkInContent(before, [0, 0], {
				text: "x",
				url: "https://example.com/x",
			}),
		).toBe(null);
	});
});
