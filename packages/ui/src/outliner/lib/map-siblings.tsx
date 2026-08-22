import type { OutlineNode } from "../types";

export type SiblingRenderer = (
	node: OutlineNode,
	depth: number,
	previousSiblingId?: string,
) => React.ReactNode;

export function mapSiblings(
	nodes: OutlineNode[],
	depth: number,
	render: SiblingRenderer,
) {
	return nodes.map((node, index) => (
		<div key={node.id}>{render(node, depth, nodes[index - 1]?.id)}</div>
	));
}
