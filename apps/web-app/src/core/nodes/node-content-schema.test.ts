import {
	$createAutoLinkNode,
	$createLinkNode,
	AutoLinkNode,
	LinkNode,
} from "@lexical/link";
import { $createHeadingNode, HeadingNode } from "@lexical/rich-text";
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

	// Same drift guard as above, for @lexical/link: build the link with the
	// real LinkNode so the allowlist can't silently fall out of sync with the
	// fields it serializes (url, rel, target, title).
	it("accepts a link node produced by a real Lexical editor", () => {
		const editor = createEditor({ nodes: [LinkNode] });
		editor.update(
			() => {
				const paragraph = $createParagraphNode();
				const link = $createLinkNode(
					"https://example.com/some/very/long/path?query=1",
				);
				link.append($createTextNode("example.com/some/very/…"));
				paragraph.append($createTextNode("see "), link);
				$getRoot().append(paragraph);
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

	// Typed URLs are stored as AutoLinkNodes (the AutoLink plugin converts
	// while typing), which additionally serialize `isUnlinked`.
	it("accepts an autolink node produced by a real Lexical editor", () => {
		const editor = createEditor({ nodes: [AutoLinkNode] });
		editor.update(
			() => {
				const paragraph = $createParagraphNode();
				const link = $createAutoLinkNode("https://example.com/typed");
				link.append($createTextNode("https://example.com/typed"));
				paragraph.append(link);
				$getRoot().append(paragraph);
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

	// Same drift guard, for @lexical/rich-text: build the heading with the
	// real HeadingNode so the allowlist can't silently fall out of sync with
	// the `tag` field it serializes.
	it("accepts a heading node produced by a real Lexical editor", () => {
		const editor = createEditor({ nodes: [HeadingNode] });
		editor.update(
			() => {
				const heading = $createHeadingNode("h2");
				heading.append($createTextNode("A title"));
				$getRoot().append(heading);
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

	it("accepts null content (reverting a freshly created node's first edit)", () => {
		const result = updateNodeContentInputSchema.safeParse({
			id: "some-id",
			content: null,
		});
		expect(result.success).toBe(true);
	});

	it("rejects a link whose url is not http(s)", () => {
		const link = {
			type: "link",
			version: 1,
			direction: "ltr" as const,
			format: "",
			indent: 0,
			url: "javascript:alert(1)",
			rel: null,
			target: null,
			title: null,
			children: [textNode("click me")],
		};
		const result = updateNodeContentInputSchema.safeParse(
			buildInput(root([paragraph([link])])),
		);
		expect(result.success).toBe(false);
	});
});
