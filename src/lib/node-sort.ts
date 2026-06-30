import type { NodeType } from "#/core/nodes/node.types";

export function sortByOrder(nodes: NodeType[]): NodeType[] {
	return [...nodes].sort((a, b) => {
		if (a.order === null) return 1;
		if (b.order === null) return -1;
		return a.order < b.order ? -1 : a.order > b.order ? 1 : 0;
	});
}
