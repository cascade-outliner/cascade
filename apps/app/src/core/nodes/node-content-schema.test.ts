import {
	$createEditableLinkNode,
	EditableLinkNode,
} from "@cascade/outliner/lexical-editable-link-node";
import { $createLinkNode, LinkNode } from "@lexical/link";
import {
	$createParagraphNode,
	$createTextNode,
	$getRoot,
	createEditor,
} from "lexical";
import { describe, expect, it } from "vitest";
import {
	MAX_CHILDREN_PER_NODE,
	MAX_LEXICAL_DEPTH,
	MAX_TEXT_LENGTH,
	MAX_URL_LENGTH,
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

	// Regression test: the schema's `.strict()` allowlist was initially missing
	// `textFormat`/`textStyle`, which Lexical's ElementNode (root, paragraph)
	// always serializes. That silently rejected every real edit as soon as it
	// left the editor, since hand-written fixtures above don't reproduce the
	// exact shape the actual library emits. Build editor state with the real
	// `lexical` package instead of a hand-rolled fixture so this can't drift
	// out of sync again.
	it("accepts content produced by a real Lexical editor", () => {
		const editor = createEditor();
		editor.update(
			() => {
				const root = $getRoot();

				const paragraph = $createParagraphNode();
				const text = $createTextNode("hello world");
				text.toggleFormat("bold");
				paragraph.append(text);
				root.append(paragraph);

				const secondParagraph = $createParagraphNode();
				secondParagraph.append($createTextNode("plain second line"));
				root.append(secondParagraph);

				root.append($createParagraphNode());
			},
			{ discrete: true },
		);

		const content = editor.getEditorState().toJSON();
		const result = updateNodeContentInputSchema.safeParse({
			id: "some-id",
			content,
		});
		expect(result.success).toBe(true);
	});

	// Regression test mirroring the one above: a hand-rolled link fixture
	// wouldn't catch the schema drifting from what @lexical/link actually
	// serializes (rel/target/title/url), so build it with the real node.
	it("accepts a link node produced by the real @lexical/link LinkNode", () => {
		const editor = createEditor({ nodes: [LinkNode] });
		editor.update(
			() => {
				const root = $getRoot();
				const paragraph = $createParagraphNode();
				const link = $createLinkNode("https://example.com/some/path", {
					title: "https://example.com/some/path",
				});
				link.append($createTextNode("example.com/some/path"));
				paragraph.append(link);
				root.append(paragraph);
			},
			{ discrete: true },
		);

		const content = editor.getEditorState().toJSON();
		const result = updateNodeContentInputSchema.safeParse({
			id: "some-id",
			content,
		});
		expect(result.success).toBe(true);
	});

	// The editable surface actually persists links via EditableLinkNode (a
	// DecoratorNode), not @lexical/link's LinkNode above — its exportJSON is
	// hand-written to match that same wire shape, so guard it the same way.
	it("accepts a link node produced by the real EditableLinkNode", () => {
		const editor = createEditor({ nodes: [EditableLinkNode] });
		editor.update(
			() => {
				const root = $getRoot();
				const paragraph = $createParagraphNode();
				const link = $createEditableLinkNode(
					"https://example.com/some/path",
					"example.com/some/path",
					"https://example.com/some/path",
				);
				paragraph.append(link);
				root.append(paragraph);
			},
			{ discrete: true },
		);

		const content = editor.getEditorState().toJSON();
		const result = updateNodeContentInputSchema.safeParse({
			id: "some-id",
			content,
		});
		expect(result.success).toBe(true);
	});

	it("rejects a url longer than the max length", () => {
		const result = updateNodeContentInputSchema.safeParse(
			buildInput(
				root([
					paragraph([
						{
							type: "link",
							url: `https://example.com/${"a".repeat(MAX_URL_LENGTH)}`,
							children: [textNode("example.com")],
						},
					]),
				]),
			),
		);
		expect(result.success).toBe(false);
	});
});
