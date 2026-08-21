import { mapSiblings, type SiblingRenderer } from "../lib/map-siblings";
import type { OutlineNode } from "../types";

export interface ListProps {
	nodes: OutlineNode[];
	children: SiblingRenderer;
}

export function List({ nodes, children }: ListProps) {
	return <>{mapSiblings(nodes, 0, children)}</>;
}
