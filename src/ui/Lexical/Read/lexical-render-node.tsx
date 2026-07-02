import type { ReactNode } from "react";
import type { LexicalElementNode } from "@/ui/lexical/read/lexical-read-view";
import {
	type LexicalTextNode,
	renderTextNode,
} from "@/ui/lexical/read/render-text-nodes";

export function renderNode(
	node: LexicalTextNode | LexicalElementNode,
	key: number,
): ReactNode {
	switch (node.type) {
		case "text":
			return renderTextNode(node as LexicalTextNode, key);

		case "paragraph": {
			const children =
				node.children?.map((child, index) => renderNode(child, index)) ?? null;

			return <p key={key}>{children}</p>;
		}

		default: {
			// Unknown node types degrade to their text content instead of
			// crashing the read view; the editor remains the source of truth.
			const children =
				"children" in node && node.children
					? node.children.map((child, index) => renderNode(child, index))
					: null;
			return <span key={key}>{children}</span>;
		}
	}
}
