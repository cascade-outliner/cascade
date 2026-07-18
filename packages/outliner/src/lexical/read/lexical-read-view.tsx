import { renderNode } from "./lexical-render-node";
import type { OnDeleteLink, OnSaveLink } from "./node-link-view";
import type { LexicalTextNode } from "./render-text-nodes";

export interface LexicalElementNode {
	type: string;
	children?: (LexicalTextNode | LexicalElementNode)[];
}

interface LexicalReadViewProps {
	content: { root: LexicalElementNode } | null;
	/** Enables the click-to-edit popover on links; called with the link's path and new text/url. */
	onSaveLink?: OnSaveLink;
	/** Popover delete action: replaces the link with its plain text. */
	onDeleteLink?: OnDeleteLink;
}

export function LexicalReadView({
	content,
	onSaveLink,
	onDeleteLink,
}: LexicalReadViewProps) {
	if (!content) return <p>&nbsp;</p>;
	return (
		<>
			{content.root.children?.map((child, index) =>
				renderNode(child, index, 0, {
					onSaveLink,
					onDeleteLink,
					path: [index],
				}),
			)}
		</>
	);
}
