import { renderNode } from "./lexical-render-node";
import type { LexicalTextNode } from "./render-text-nodes";

export interface LexicalElementNode {
	type: string;
	children?: (LexicalTextNode | LexicalElementNode)[];
	// Present on "link" nodes; kept on the generic shape rather than a
	// separate type so callers don't need to narrow before reading them.
	url?: string;
	title?: string | null;
}

interface LexicalReadViewProps {
	content: { root: LexicalElementNode } | null;
}

export function LexicalReadView({ content }: LexicalReadViewProps) {
	if (!content) return <p>&nbsp;</p>;
	return (
		<>
			{content.root.children?.map((child, index) => renderNode(child, index))}
		</>
	);
}
