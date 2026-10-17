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

/** `id`'s ancestors, from the tree's root down to its immediate parent. */
export function ancestorsOf(
	nodes: { get(id: string): Node | undefined },
	id: string,
): Node[] {
	const chain: Node[] = [];
	let current = nodes.get(id)?.parentId ?? null;
	while (current !== null) {
		const node = nodes.get(current);
		if (!node) {
			break;
		}
		chain.push(node);
		current = node.parentId;
	}
	return chain.reverse();
}

/** `id` plus every descendant, in no particular order. */
export function descendantsOf(children: Children, id: string): string[] {
	const collected = new Set<string>();
	const stack = [id];
	for (
		let current = stack.pop();
		current !== undefined;
		current = stack.pop()
	) {
		// Guards against a parent cycle that slipped past `breakCycles`.
		if (collected.has(current)) {
			continue;
		}
		collected.add(current);
		for (const child of childrenOf(children, current)) {
			stack.push(child.id);
		}
	}
	return [...collected];
}

/**
 * The visible rows below `rootId` (the whole outline when `null`), depth-first.
 * Children of collapsed nodes are left out, unless `all`.
 */
export function rowsOf(
	children: Children,
	rootId: string | null,
	all = false,
): Row[] {
	const rows: Row[] = [];
	const seen = new Set(rootId === null ? [] : [rootId]);
	const walk = (parentId: string | null, depth: number) => {
		for (const node of childrenOf(children, parentId)) {
			// Guards against a parent cycle that slipped past `breakCycles`.
			if (seen.has(node.id)) {
				continue;
			}
			seen.add(node.id);
			const childCount = childrenOf(children, node.id).length;
			rows.push({ node, depth, childCount });
			if (childCount > 0 && (all || !node.collapsed)) {
				walk(node.id, depth + 1);
			}
		}
	};
	walk(rootId, 0);
	return rows;
}

/**
 * Reparents to the root any node whose parent chain loops back on itself, so
 * tree walks terminate. Two tabs can each make a locally valid move that forms
 * a cycle once both are persisted. Returns the nodes it changed.
 */
export function breakCycles(nodes: {
	get(id: string): Node | undefined;
	values(): Iterable<Node>;
}): Node[] {
	const fixed: Node[] = [];
	const acyclic = new Set<string>();
	for (const start of nodes.values()) {
		const chain = new Set<string>();
		let node: Node | undefined = start;
		while (node && !acyclic.has(node.id)) {
			if (chain.has(node.id)) {
				node.parentId = null;
				fixed.push(node);
				break;
			}
			chain.add(node.id);
			node = node.parentId === null ? undefined : nodes.get(node.parentId);
		}
		for (const id of chain) {
			acyclic.add(id);
		}
	}
	return fixed;
}
