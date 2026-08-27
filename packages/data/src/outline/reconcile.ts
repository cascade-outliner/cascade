import type { NodeSnapshot } from "../types.ts";

/**
 * Repair `parentId`/`childIds` disagreement on load and return a clean root
 * order. `childIds` entries are filtered against the child's own `parentId`;
 * anything left unreachable - an orphan, or a cycle - is detached and appended
 * at root level rather than dropped. Mutates the snapshots in `nodes` in place.
 */
export function reconcile(
	nodes: Map<string, NodeSnapshot>,
	persistedRootIds: string[],
): string[] {
	const placed = new Set<string>();
	const keep = (ids: string[], parentId: string | null) =>
		ids.filter((id) => {
			const node = nodes.get(id);
			if (!node || node.parentId !== parentId || placed.has(id)) {
				return false;
			}
			placed.add(id);
			return true;
		});

	const rootIds = keep(persistedRootIds, null);
	for (const node of nodes.values()) {
		node.childIds = keep(node.childIds, node.id);
	}

	const reached = new Set<string>();
	const walk = (ids: string[]) => {
		const stack = [...ids];
		while (stack.length > 0) {
			const id = stack.pop();
			if (id === undefined || reached.has(id)) {
				continue;
			}
			reached.add(id);
			const node = nodes.get(id);
			if (node) {
				stack.push(...node.childIds);
			}
		}
	};
	walk(rootIds);

	const unreached = [...nodes.values()]
		.filter((node) => !reached.has(node.id))
		.sort((a, b) => a.createdAt - b.createdAt);

	for (const node of unreached) {
		if (reached.has(node.id)) {
			continue;
		}

		const parent = node.parentId === null ? null : nodes.get(node.parentId);
		if (parent) {
			parent.childIds = parent.childIds.filter((id) => id !== node.id);
		}

		node.parentId = null;
		rootIds.push(node.id);
		walk([node.id]);
	}

	return rootIds;
}
