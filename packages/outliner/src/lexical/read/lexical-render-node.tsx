import type { ReactNode } from "react";
import { linkTextContent, type SerializedLinkNode } from "../link-content";
import { isHttpUrl, tidyUrlLabel } from "../link-url";
import type { LexicalElementNode } from "./lexical-read-view";
import {
	NodeLinkView,
	type OnDeleteLink,
	type OnSaveLink,
} from "./node-link-view";
import { type LexicalTextNode, renderTextNode } from "./render-text-nodes";

// Defense in depth against pathologically nested content (e.g. pre-existing
// rows written before size/depth limits were enforced on write).
const MAX_RENDER_DEPTH = 64;

// h6 matches the surrounding row text's base size; each level up from there
// steps up one Tailwind size, same as a standard heading scale.
const HEADING_CLASSES: Record<
	NonNullable<LexicalElementNode["tag"]>,
	string
> = {
	h1: "text-4xl font-bold",
	h2: "text-3xl font-bold",
	h3: "text-2xl font-bold",
	h4: "text-xl font-bold",
	h5: "text-lg font-bold",
	h6: "text-base font-bold",
};

export interface RenderNodeOptions {
	/** When set, links render with a click-to-edit popover; `path` is the chain of child indexes from the root. */
	onSaveLink?: OnSaveLink;
	/** Popover delete action: replaces the link with its plain text. */
	onDeleteLink?: OnDeleteLink;
	path?: number[];
}

export function renderNode(
	node: LexicalTextNode | LexicalElementNode,
	key: number,
	depth = 0,
	options?: RenderNodeOptions,
): ReactNode {
	if (depth > MAX_RENDER_DEPTH) return null;

	const path = options?.path ?? [];
	const renderChildren = (children: LexicalElementNode["children"]) =>
		children?.map((child, index) =>
			renderNode(
				child,
				index,
				depth + 1,
				options && { ...options, path: [...path, index] },
			),
		) ?? null;

	switch (node.type) {
		case "text":
			return renderTextNode(node as LexicalTextNode, key);

		case "paragraph": {
			return <p key={key}>{renderChildren(node.children)}</p>;
		}

		case "heading": {
			const tag = (node as LexicalElementNode).tag ?? "h1";
			const Tag = tag;
			return (
				<Tag key={key} className={HEADING_CLASSES[tag]}>
					{renderChildren(node.children)}
				</Tag>
			);
		}

		case "link":
		case "autolink": {
			const link = node as SerializedLinkNode;
			// Never give a non-http(s) URL an href, and honor an autolink the
			// user explicitly unlinked; both degrade to plain text.
			if (
				link.isUnlinked === true ||
				typeof link.url !== "string" ||
				!isHttpUrl(link.url)
			) {
				return <span key={key}>{renderChildren(link.children)}</span>;
			}
			// Links whose text is just the URL (typed autolinks) display the
			// tidy label; explicit labels are rendered as-is with formatting.
			const text = linkTextContent(link);
			const isRawUrlText = text === link.url || `https://${text}` === link.url;
			const label = isRawUrlText ? tidyUrlLabel(link.url) : text;
			return (
				<NodeLinkView
					key={key}
					url={link.url}
					text={label}
					path={path}
					onSaveLink={options?.onSaveLink}
					onDeleteLink={options?.onDeleteLink}
				>
					{isRawUrlText ? label : renderChildren(link.children)}
				</NodeLinkView>
			);
		}

		default: {
			// Unknown node types degrade to their text content instead of
			// crashing the read view; the editor remains the source of truth.
			const children =
				"children" in node && node.children
					? renderChildren(node.children)
					: null;
			return <span key={key}>{children}</span>;
		}
	}
}
