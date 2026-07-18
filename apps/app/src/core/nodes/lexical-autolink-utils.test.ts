import {
	finalizePendingAutoLinks,
	urlLinkMatcher,
} from "@cascade/outliner/lexical-autolink-utils";
import {
	$isEditableLinkNode,
	EditableLinkNode,
} from "@cascade/outliner/lexical-editable-link-node";
import {
	$createAutoLinkNode,
	AutoLinkNode,
	registerAutoLink,
} from "@lexical/link";
import {
	$createParagraphNode,
	$createTextNode,
	$getRoot,
	$getSelection,
	$isElementNode,
	$isRangeSelection,
	createEditor,
	type ElementNode,
	type LexicalNode,
} from "lexical";
import { describe, expect, it } from "vitest";

function asElement(node: LexicalNode | null | undefined): ElementNode {
	if (!node || !$isElementNode(node)) throw new Error("expected element node");
	return node;
}

describe("urlLinkMatcher", () => {
	it("matches a bare http(s) url within a larger string", () => {
		const match = urlLinkMatcher("see https://example.com/docs for more");
		expect(match?.url).toBe("https://example.com/docs");
		expect(match?.text).toBe("https://example.com/docs");
	});

	it("does not match a bare domain without a protocol", () => {
		expect(urlLinkMatcher("visit example.com today")).toBeNull();
	});

	it("does not swallow a trailing sentence period", () => {
		const match = urlLinkMatcher("check https://example.com/docs.");
		expect(match?.text).toBe("https://example.com/docs");
	});
});

function createLinkEditor() {
	return createEditor({ nodes: [AutoLinkNode, EditableLinkNode] });
}

describe("finalizePendingAutoLinks", () => {
	it("replaces a typed autolink with a tidy plain link node", () => {
		const editor = createLinkEditor();
		editor.update(
			() => {
				const paragraph = $createParagraphNode();
				const autoLink = $createAutoLinkNode(
					"https://www.example.com/some/long/path",
				);
				autoLink.append(
					$createTextNode("https://www.example.com/some/long/path"),
				);
				paragraph.append(autoLink);
				$getRoot().append(paragraph);
			},
			{ discrete: true },
		);

		finalizePendingAutoLinks(editor);

		editor.getEditorState().read(() => {
			const paragraph = asElement($getRoot().getFirstChildOrThrow());
			const link = paragraph.getFirstChildOrThrow();
			expect(link.getType()).toBe("link");
			if (!$isEditableLinkNode(link)) throw new Error("expected a link node");
			expect(link.getURL()).toBe("https://www.example.com/some/long/path");
			expect(link.getTextContent()).toBe("example.com/some/long/path");
		});
	});

	// Regression test: right after typing a url (before a trailing separator
	// moves the cursor past it, or on blur/unmount while still inside it),
	// the selection sits in the autolink's text child. Replacing that child
	// without moving selection somewhere valid made Lexical throw and abort
	// the whole update, leaving the untidied (and schema-rejected) autolink
	// node in what got saved.
	it("preserves selection that was inside the autolink being replaced", () => {
		const editor = createLinkEditor();
		editor.update(
			() => {
				const paragraph = $createParagraphNode();
				const autoLink = $createAutoLinkNode("https://example.com/docs");
				const text = $createTextNode("https://example.com/docs");
				autoLink.append(text);
				paragraph.append(autoLink);
				$getRoot().append(paragraph);
				text.select();
			},
			{ discrete: true },
		);

		expect(() => finalizePendingAutoLinks(editor)).not.toThrow();

		editor.getEditorState().read(() => {
			const paragraph = asElement($getRoot().getFirstChildOrThrow());
			const link = paragraph.getFirstChildOrThrow();
			expect(link.getType()).toBe("link");
			expect(link.getTextContent()).toBe("example.com/docs");

			// The exact landing spot doesn't matter (the link is a leaf node, so
			// there's no "inside" to select into) — just that it's some valid
			// selection within the same paragraph, not a dangling reference to
			// the removed autolink text node.
			const selection = $getSelection();
			expect($isRangeSelection(selection)).toBe(true);
			if ($isRangeSelection(selection)) {
				const anchorNode = selection.anchor.getNode();
				expect([link.getKey(), paragraph.getKey()]).toContain(
					anchorNode.getKey(),
				);
			}
		});
	});

	it("leaves an unlinked autolink untouched", () => {
		const editor = createLinkEditor();
		editor.update(
			() => {
				const paragraph = $createParagraphNode();
				const autoLink = $createAutoLinkNode("https://example.com", {
					isUnlinked: true,
				});
				autoLink.append($createTextNode("not a url anymore"));
				paragraph.append(autoLink);
				$getRoot().append(paragraph);
			},
			{ discrete: true },
		);

		finalizePendingAutoLinks(editor);

		editor.getEditorState().read(() => {
			const paragraph = asElement($getRoot().getFirstChildOrThrow());
			const node = paragraph.getFirstChildOrThrow();
			expect(node.getType()).toBe("autolink");
			expect(node.getTextContent()).toBe("not a url anymore");
		});
	});
});

describe("registerAutoLink + finalizePendingAutoLinks (end to end)", () => {
	it("autolinks a typed url and then tidies it once editing is done", () => {
		const editor = createLinkEditor();

		const unregister = registerAutoLink(editor, {
			matchers: [urlLinkMatcher],
			changeHandlers: [],
			excludeParents: [],
		});

		try {
			// Simulate the user typing the url out (not pasting it), in one go
			// so no reconciliation happens between creating the empty text node
			// and selecting into it.
			editor.update(
				() => {
					const paragraph = $createParagraphNode();
					const text = $createTextNode("");
					paragraph.append(text);
					$getRoot().append(paragraph);
					text.select(0, 0);
					const selection = $getSelection();
					if ($isRangeSelection(selection)) {
						selection.insertText("check out https://www.example.com/docs ");
					}
				},
				{ discrete: true },
			);

			// Still showing the raw url while "typing" — nothing has finalized it yet.
			editor.getEditorState().read(() => {
				const paragraph = asElement($getRoot().getFirstChildOrThrow());
				const link = paragraph
					.getChildren()
					.find((child) => child.getType() === "autolink");
				expect(link?.getTextContent()).toBe("https://www.example.com/docs");
			});

			finalizePendingAutoLinks(editor);

			editor.getEditorState().read(() => {
				const paragraph = asElement($getRoot().getFirstChildOrThrow());
				const link = paragraph
					.getChildren()
					.find((child) => $isEditableLinkNode(child));
				expect(link?.getType()).toBe("link");
				expect(link?.getTextContent()).toBe("example.com/docs");
			});
		} finally {
			unregister();
		}
	});
});
