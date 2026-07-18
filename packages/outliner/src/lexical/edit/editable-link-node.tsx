import type {
	DOMExportOutput,
	LexicalNode,
	NodeKey,
	SerializedLexicalNode,
	Spread,
} from "lexical";
import { $applyNodeReplacement, DecoratorNode } from "lexical";
import type { ReactNode } from "react";
import { EditableLinkView } from "./editable-link-view";

// Matches the wire shape @lexical/link's LinkNode.exportJSON() produces, so
// this node reads/writes the exact same "link" content the read view and
// server schema already expect — only how it's edited changes.
export type SerializedEditableLinkNode = Spread<
	{
		url: string;
		rel: string | null;
		target: string | null;
		title: string | null;
		children: [{ type: "text"; version: 1; text: string }];
	},
	SerializedLexicalNode
>;

export class EditableLinkNode extends DecoratorNode<ReactNode> {
	__url: string;
	__text: string;
	__title: string | null;

	static getType(): string {
		return "link";
	}

	static clone(node: EditableLinkNode): EditableLinkNode {
		return new EditableLinkNode(
			node.__url,
			node.__text,
			node.__title,
			node.__key,
		);
	}

	constructor(
		url: string,
		text: string,
		title: string | null = null,
		key?: NodeKey,
	) {
		super(key);
		this.__url = url;
		this.__text = text;
		this.__title = title;
	}

	static importJSON(
		serializedNode: SerializedEditableLinkNode,
	): EditableLinkNode {
		const text = serializedNode.children.map((child) => child.text).join("");
		return $createEditableLinkNode(
			serializedNode.url,
			text,
			serializedNode.title,
		);
	}

	exportJSON(): SerializedEditableLinkNode {
		return {
			type: "link",
			version: 1,
			url: this.__url,
			rel: null,
			target: null,
			title: this.__title,
			children: [{ type: "text", version: 1, text: this.__text }],
		};
	}

	getURL(): string {
		return this.getLatest().__url;
	}

	setURL(url: string): void {
		this.getWritable().__url = url;
	}

	getLinkText(): string {
		return this.getLatest().__text;
	}

	setLinkText(text: string): void {
		this.getWritable().__text = text;
	}

	getTitleText(): string | null {
		return this.getLatest().__title;
	}

	setTitleText(title: string | null): void {
		this.getWritable().__title = title;
	}

	getTextContent(): string {
		return this.getLatest().__text;
	}

	createDOM(): HTMLElement {
		return document.createElement("span");
	}

	updateDOM(): boolean {
		return false;
	}

	exportDOM(): DOMExportOutput {
		const anchor = document.createElement("a");
		anchor.href = this.__url;
		anchor.title = this.__title ?? this.__url;
		anchor.textContent = this.__text;
		return { element: anchor };
	}

	isInline(): true {
		return true;
	}

	decorate(): ReactNode {
		return (
			<EditableLinkView
				nodeKey={this.getKey()}
				url={this.__url}
				text={this.__text}
				title={this.__title}
			/>
		);
	}
}

export function $createEditableLinkNode(
	url: string,
	text: string,
	title: string | null = null,
): EditableLinkNode {
	return $applyNodeReplacement(new EditableLinkNode(url, text, title));
}

export function $isEditableLinkNode(
	node: LexicalNode | null | undefined,
): node is EditableLinkNode {
	return node instanceof EditableLinkNode;
}
