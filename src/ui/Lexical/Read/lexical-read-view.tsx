import { renderNode } from "#/ui/lexical/read/lexical-render-node";
import type { LexicalTextNode } from "#/ui/lexical/read/render-text-nodes";

export interface LexicalElementNode {
	type: string;
	children?: (LexicalTextNode | LexicalElementNode)[];
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
