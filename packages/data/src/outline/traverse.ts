import type { NodeSnapshot } from "../types.ts";

/** Walk up from `id`; true if `ancestorId` is on the chain. */
export function isDescendant(
	nodes: Map<string, NodeSnapshot>,
	id: string,
	ancestorId: string,
): boolean {
	let current = nodes.get(id)?.parentId ?? null;
	while (current !== null) {
		if (current === ancestorId) {
			return true;
		}
		current = nodes.get(current)?.parentId ?? null;
	}
	return false;
}

/** `root` plus every descendant reachable through `childIds`, DFS order. */
export function collectSubtree(
	nodes: Map<string, NodeSnapshot>,
	root: NodeSnapshot,
): NodeSnapshot[] {
	const collected: NodeSnapshot[] = [];
	const stack = [root];

	while (stack.length > 0) {
		const node = stack.pop();
		if (!node) {
			continue;
		}
		collected.push(node);
		for (const childId of node.childIds) {
			const child = nodes.get(childId);
			if (child) {
				stack.push(child);
			}
		}
	}

	return collected;
}
