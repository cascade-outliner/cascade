import type { VisibleTree } from "../model/tree.types";
import type { VirtualTreeProps } from "../model/virtual-tree.types";
import { useTreeEditing } from "./use-tree-editing";
import { useTreeVirtualizer } from "./use-tree-virtualizer";

/** Composes the stateful editing and virtualization boundaries. */
export function useTreeInteractions(
	tree: VisibleTree,
	newNodeDueDate: VirtualTreeProps["newNodeDueDate"],
	newNodeTags: VirtualTreeProps["newNodeTags"],
) {
	const viewport = useTreeVirtualizer(tree);
	const editing = useTreeEditing(tree, newNodeDueDate, newNodeTags, viewport);
	return { ...viewport, ...editing };
}
