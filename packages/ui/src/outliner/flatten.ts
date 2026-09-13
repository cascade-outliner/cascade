import type { OutlineNode } from "@cascade/data";

export interface FlatNode {
	node: OutlineNode;
	depth: number;
}

export function flatten(
	nodes: OutlineNode[],
	skipChildrenOf: string | null = null,
): FlatNode[] {
	const out: FlatNode[] = [];
	const walk = (level: OutlineNode[], depth: number) => {
		for (const node of level) {
			out.push({ node, depth });
			if (
				node.children.length > 0 &&
				!node.collapsed &&
				node.id !== skipChildrenOf
			) {
				walk(node.children, depth + 1);
			}
		}
	};
	walk(nodes, 0);
	return out;
}
