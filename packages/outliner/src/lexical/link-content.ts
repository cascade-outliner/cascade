import type { LexicalElementNode } from "./read/lexical-read-view";
import type { LexicalTextNode } from "./read/render-text-nodes";

export interface SerializedLinkNode extends LexicalElementNode {
	url?: string;
	/** AutoLinkNode only: true once the user has explicitly removed the link. */
	isUnlinked?: boolean;
}

export interface LinkUpdate {
	text: string;
	url: string;
}

/** Concatenated text of a link node's direct text children (the visible label). */
export function linkTextContent(node: LexicalElementNode): string {
	return (node.children ?? [])
		.map((child) =>
			child.type === "text" ? (child as LexicalTextNode).text : "",
		)
		.join("");
}

/**
 * Returns a copy of `content` with the link node at `path` (child indexes
 * starting from the root) updated to `update`, or null when the path no
 * longer resolves to a link node (the content changed under the popover).
 *
 * The link's children are replaced with a single text node so the saved label
 * is exactly what the user typed; the first existing text child's formatting
 * fields are preserved when present.
 */
export function updateLinkInContent(
	content: { root: LexicalElementNode },
	path: number[],
	update: LinkUpdate,
): { root: LexicalElementNode } | null {
	const cloned = structuredClone(content);
	let node: LexicalElementNode | LexicalTextNode = cloned.root;
	for (const index of path) {
		const children: (LexicalElementNode | LexicalTextNode)[] | undefined =
			"children" in node ? node.children : undefined;
		const next: LexicalElementNode | LexicalTextNode | undefined =
			children?.[index];
		if (!next) return null;
		node = next;
	}
	if (node.type !== "link" && node.type !== "autolink") return null;
	const link = node as SerializedLinkNode;
	// A popover edit makes the link intentional: store it as a manual link so
	// the editor's AutoLink transform can't rewrite or unlink the custom label.
	link.type = "link";
	delete link.isUnlinked;
	link.url = update.url;
	const firstText = link.children?.find((child) => child.type === "text") as
		| LexicalTextNode
		| undefined;
	const textNode = firstText
		? { ...firstText, text: update.text }
		: ({
				type: "text",
				text: update.text,
				version: 1,
				format: 0,
				detail: 0,
				mode: "normal",
				style: "",
			} as LexicalTextNode);
	link.children = [textNode];
	return cloned;
}
