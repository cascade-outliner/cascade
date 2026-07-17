import type { ReactNode } from "react";
import type { LexicalElementNode } from "./lexical-read-view";
import { type LexicalTextNode, renderTextNode } from "./render-text-nodes";

// Defense in depth against pathologically nested content (e.g. pre-existing
// rows written before size/depth limits were enforced on write).
const MAX_RENDER_DEPTH = 64;

export function renderNode(
	node: LexicalTextNode | LexicalElementNode,
	key: number,
	depth = 0,
): ReactNode {
	if (depth > MAX_RENDER_DEPTH) return null;

	switch (node.type) {
		case "text":
			return renderTextNode(node as LexicalTextNode, key);

		case "paragraph": {
			const children =
				node.children?.map((child, index) =>
					renderNode(child, index, depth + 1),
				) ?? null;

			return <p key={key}>{children}</p>;
		}

		case "link": {
			const children =
				node.children?.map((child, index) =>
					renderNode(child, index, depth + 1),
				) ?? null;

			return (
				<a
					key={key}
					href={node.url}
					title={node.title || node.url}
					target="_blank"
					rel="noopener noreferrer"
				>
					{children}
				</a>
			);
		}

		default: {
			// Unknown node types degrade to their text content instead of
			// crashing the read view; the editor remains the source of truth.
			const children =
				"children" in node && node.children
					? node.children.map((child, index) =>
							renderNode(child, index, depth + 1),
						)
					: null;
			return <span key={key}>{children}</span>;
		}
	}
}
