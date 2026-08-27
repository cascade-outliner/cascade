import type { Mutation, NodeSnapshot } from "../types.ts";
import { collectSubtree, isDescendant } from "./traverse.ts";
import type { Outline, OutlineChange } from "./types.ts";

/**
 * Apply one mutation to `state.nodes` in place. Returns what changed, or `null`
 * if the mutation was a no-op or invalid (in which case `state.nodes` is
 * untouched). `state.rootIds` is never mutated - a new order comes back on the
 * change.
 */
export function apply(
	state: Outline,
	mutation: Mutation,
): OutlineChange | null {
	switch (mutation.type) {
		case "node.create":
			return create(state, mutation);
		case "node.update":
			return update(state, mutation);
		case "node.move":
			return move(state, mutation);
		case "node.delete":
			return remove(state, mutation);
	}
}

/** `nodes.get(id)` must exist; callers check before calling. */
function patch(
	nodes: Map<string, NodeSnapshot>,
	id: string,
	fields: Partial<NodeSnapshot>,
): NodeSnapshot {
	const next = { ...nodes.get(id), ...fields } as NodeSnapshot;
	nodes.set(id, next);
	return next;
}

function create(
	state: Outline,
	mutation: Extract<Mutation, { type: "node.create" }>,
): OutlineChange | null {
	const { nodes } = state;
	const { id, parentId, at, content } = mutation;
	if (nodes.has(id)) {
		return null;
	}

	const parent = parentId === null ? null : nodes.get(parentId);
	if (parentId !== null && !parent) {
		return null;
	}

	const node: NodeSnapshot = {
		id,
		userId: state.userId,
		parentId,
		childIds: [],
		content,
		expanded: true,
		createdAt: at,
		updatedAt: at,
		deletedAt: null,
	};
	nodes.set(id, node);

	if (parent) {
		const nextParent = patch(nodes, parent.id, {
			childIds: [...parent.childIds, id],
			updatedAt: at,
		});
		return {
			writes: [node, nextParent],
			touched: [id, parent.id],
			removed: [],
			rootIds: null,
		};
	}

	return {
		writes: [node],
		touched: [id],
		removed: [],
		rootIds: [...state.rootIds, id],
	};
}

function update(
	state: Outline,
	mutation: Extract<Mutation, { type: "node.update" }>,
): OutlineChange | null {
	if (!state.nodes.has(mutation.id)) {
		return null;
	}

	const fields: Partial<NodeSnapshot> = { updatedAt: mutation.at };
	if (mutation.patch.content !== undefined) {
		fields.content = mutation.patch.content;
	}
	if (mutation.patch.expanded !== undefined) {
		fields.expanded = mutation.patch.expanded;
	}

	const next = patch(state.nodes, mutation.id, fields);
	return { writes: [next], touched: [mutation.id], removed: [], rootIds: null };
}

function move(
	state: Outline,
	mutation: Extract<Mutation, { type: "node.move" }>,
): OutlineChange | null {
	const { nodes } = state;
	const { id, parentId, at } = mutation;
	const node = nodes.get(id);
	if (!node || parentId === node.parentId) {
		return null;
	}

	if (
		parentId !== null &&
		(parentId === id || isDescendant(nodes, parentId, id))
	) {
		return null;
	}

	const newParent = parentId === null ? null : nodes.get(parentId);
	if (parentId !== null && !newParent) {
		return null;
	}

	const touched: string[] = [id];
	let rootIds: string[] | null = null;

	const oldParent = node.parentId === null ? null : nodes.get(node.parentId);
	if (oldParent) {
		patch(nodes, oldParent.id, {
			childIds: oldParent.childIds.filter((each) => each !== id),
			updatedAt: at,
		});
		touched.push(oldParent.id);
	} else {
		rootIds = state.rootIds.filter((each) => each !== id);
	}

	patch(nodes, id, { parentId, updatedAt: at });

	if (newParent) {
		patch(nodes, newParent.id, {
			childIds: [...newParent.childIds, id],
			updatedAt: at,
		});
		touched.push(newParent.id);
	} else {
		rootIds = [...(rootIds ?? state.rootIds), id];
	}

	return {
		writes: touched.map((each) => nodes.get(each) as NodeSnapshot),
		touched,
		removed: [],
		rootIds,
	};
}

function remove(
	state: Outline,
	mutation: Extract<Mutation, { type: "node.delete" }>,
): OutlineChange | null {
	const { nodes } = state;
	const { id, at } = mutation;
	const node = nodes.get(id);
	if (!node) {
		return null;
	}

	const subtree = collectSubtree(nodes, node);
	// Tombstones keep their `childIds` so the subtree stays reconstructable.
	const writes: NodeSnapshot[] = subtree.map((each) => ({
		...each,
		deletedAt: at,
		updatedAt: at,
	}));
	for (const each of subtree) {
		nodes.delete(each.id);
	}

	const removed = subtree.map((each) => each.id);
	const parent = node.parentId === null ? null : nodes.get(node.parentId);
	if (parent) {
		writes.push(
			patch(nodes, parent.id, {
				childIds: parent.childIds.filter((each) => each !== id),
				updatedAt: at,
			}),
		);
		return { writes, touched: [parent.id], removed, rootIds: null };
	}

	return {
		writes,
		touched: [],
		removed,
		rootIds: state.rootIds.filter((each) => each !== id),
	};
}
