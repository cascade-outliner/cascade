// @vitest-environment jsdom

import { AutoLinkNode, LinkNode } from "@lexical/link";
import { registerMarkdownShortcuts } from "@lexical/markdown";
import { HeadingNode } from "@lexical/rich-text";
import {
	$createParagraphNode,
	$createTextNode,
	$getRoot,
	$getSelection,
	$isRangeSelection,
	createEditor,
	type ElementNode,
	type LexicalEditor,
	type TextNode,
} from "lexical";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MARKDOWN_SHORTCUT_TRANSFORMERS } from "./markdown-shortcuts";

/**
 * `registerMarkdownShortcuts`'s update listener only fires its transforms
 * when consecutive updates advance the selection by at most one character
 * (see its `anchorOffset > prevSelection.anchor.offset + 1` bail-out), so a
 * single bulk `insertText` for e.g. "**bold**" would never trigger it. Typing
 * one character per `editor.update()` call reproduces what a real keystroke
 * stream does.
 */
function typeText(editor: LexicalEditor, text: string) {
	for (const char of text) {
		editor.update(
			() => {
				const selection = $getSelection();
				if (!$isRangeSelection(selection)) throw new Error("no selection");
				selection.insertText(char);
			},
			{ discrete: true },
		);
	}
}

describe("MARKDOWN_SHORTCUT_TRANSFORMERS", () => {
	let editor: LexicalEditor;
	let rootElement: HTMLDivElement;

	beforeEach(() => {
		editor = createEditor({
			namespace: "markdown-shortcuts-test",
			nodes: [LinkNode, AutoLinkNode, HeadingNode],
			onError: (error) => {
				throw error;
			},
		});
		rootElement = document.createElement("div");
		rootElement.contentEditable = "true";
		document.body.appendChild(rootElement);
		editor.setRootElement(rootElement);
		registerMarkdownShortcuts(editor, MARKDOWN_SHORTCUT_TRANSFORMERS);

		editor.update(
			() => {
				const root = $getRoot();
				root.clear();
				const paragraph = $createParagraphNode();
				paragraph.append($createTextNode(""));
				root.append(paragraph);
				paragraph.selectEnd();
			},
			{ discrete: true },
		);
	});

	afterEach(() => {
		rootElement.remove();
	});

	it("converts **text** typed live into bold", () => {
		typeText(editor, "**bold** text");

		editor.getEditorState().read(() => {
			const paragraph = $getRoot().getFirstChildOrThrow<ElementNode>();
			const text = paragraph.getTextContent();
			expect(text).toBe("bold text");
			const boldNode = paragraph.getChildren()[0] as TextNode;
			expect(boldNode.getTextContent()).toBe("bold");
			expect(boldNode.hasFormat("bold")).toBe(true);
		});
	});

	it("converts _text_ typed live into italic", () => {
		typeText(editor, "_italic_ text");

		editor.getEditorState().read(() => {
			const paragraph = $getRoot().getFirstChildOrThrow<ElementNode>();
			expect(paragraph.getTextContent()).toBe("italic text");
			const italicNode = paragraph.getChildren()[0] as TextNode;
			expect(italicNode.getTextContent()).toBe("italic");
			expect(italicNode.hasFormat("italic")).toBe(true);
		});
	});

	it("converts '# ' typed at the start of a line into an h1", () => {
		typeText(editor, "# Heading");

		editor.getEditorState().read(() => {
			const block = $getRoot().getFirstChildOrThrow();
			expect(block.getType()).toBe("heading");
			expect((block as HeadingNode).getTag()).toBe("h1");
			expect(block.getTextContent()).toBe("Heading");
		});
	});

	it("converts '### ' into an h3", () => {
		typeText(editor, "### Heading");

		editor.getEditorState().read(() => {
			const block = $getRoot().getFirstChildOrThrow();
			expect(block.getType()).toBe("heading");
			expect((block as HeadingNode).getTag()).toBe("h3");
		});
	});
});
