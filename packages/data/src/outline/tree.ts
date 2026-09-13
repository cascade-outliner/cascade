import { clamp } from "../util/clamp.ts";
import { byOrder, orderBetween } from "../util/order.ts";
import type { Node, Row } from "./types.ts";

/**
 * Every parent's children, sorted by order. Root nodes are keyed by `null`.
 *
 * Pure tree queries below take this index rather than the store, so they can
 * be exercised with plain objects.
 */
export type Children = Map<string | null, Node[]>;

/** Groups `nodes` by parent and sorts each group by order. */
export function indexChildren(nodes: Iterable<Node>): Children {
	const groups: Children = new Map();
	for (const node of nodes) {
		const siblings = groups.get(node.parentId) ?? [];
		siblings.push(node);
		groups.set(node.parentId, siblings);
	}
	for (const siblings of groups.values()) {
		siblings.sort(byOrder);
	}
	return groups;
}

/** `parentId`'s children in order, or `[]` if it has none. */
export function childrenOf(
	children: Children,
	parentId: string | null,
): Node[] {
	return children.get(parentId) ?? [];
}

/** `node`'s position among its siblings, or `-1` if it isn't indexed. */
export function indexOf(children: Children, node: Node): number {
	return childrenOf(children, node.parentId).indexOf(node);
}

/**
 * The order key that places a node at `index` among `parentId`'s children
 * (appended when omitted), ignoring `excluding` if it's already there.
 */
export function orderAt(
	children: Children,
	parentId: string | null,
	index?: number,
	excluding?: string,
): string {
	const siblings = childrenOf(children, parentId).filter(
		(each) => each.id !== excluding,
	);
	const at =
		index === undefined ? siblings.length : clamp(index, 0, siblings.length);
	return orderBetween(siblings[at - 1]?.order, siblings[at]?.order);
}

/** Whether `ancestorId` is on the parent chain of `id`. */
export function isDescendant(
	nodes: { get(id: string): Node | undefined },
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

/** `id` plus every descendant, in no particular order. */
export function descendantsOf(children: Children, id: string): string[] {
	const collected: string[] = [];
	const stack = [id];
	for (
		let current = stack.pop();
		current !== undefined;
		current = stack.pop()
	) {
		collected.push(current);
		for (const child of childrenOf(children, current)) {
			stack.push(child.id);
		}
	}
	return collected;
}

/**
 * The visible rows below `rootId` (the whole outline when `null`), depth-first.
 * Children of collapsed nodes are left out.
 */
export function rowsOf(children: Children, rootId: string | null): Row[] {
	const rows: Row[] = [];
	const walk = (parentId: string | null, depth: number) => {
		for (const node of childrenOf(children, parentId)) {
			const childCount = childrenOf(children, node.id).length;
			rows.push({ node, depth, childCount });
			if (childCount > 0 && !node.collapsed) {
				walk(node.id, depth + 1);
			}
		}
	};
	walk(rootId, 0);
	return rows;
}
