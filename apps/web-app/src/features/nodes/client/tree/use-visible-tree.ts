import { buildVisibleTree } from "@cascade/outliner/build-visible-tree";
import type { VisibleTree } from "@cascade/outliner/tree-types";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import {
	useCreateMutation,
	useDuplicateMutation,
	useMoveMutation,
	useRemoveMutation,
	useSetDueDateMutation,
	useSetIconMutation,
	useSetRecurrenceMutation,
	useSetTagsMutation,
	useSetTaskCompletedMutation,
	useSetTypeMutation,
	useToggleMutation,
	useUpdateContentMutation,
} from "./mutations";
import { visibleTreeOptions } from "./visible-tree-query";

export { visibleTreeOptions } from "./visible-tree-query";

/**
 * Composition root for the flat visible-tree cache entry: wires the query
 * plus every mutation hook under `./mutations` that patches it. Each
 * mutation hook owns its own optimistic patch/reconcile logic against the
 * shared raw `queryKey`; this hook derives the depth-first `rows` a given
 * view (main tree, node-detail subtree) actually renders via
 * `buildVisibleTree`, and assembles the mutations into the `VisibleTree`
 * shape consumers use.
 */
export function useVisibleTree(
	rootId: string | null,
	includeCollapsedDescendants = false,
): VisibleTree {
	const options = visibleTreeOptions();
	const { data } = useSuspenseQuery(options);
	const rows = useMemo(
		() =>
			buildVisibleTree(data.rows, rootId, {
				includeCollapsed: includeCollapsedDescendants,
			}),
		[data.rows, rootId, includeCollapsedDescendants],
	);

	const toggle = useToggleMutation(options.queryKey);
	const move = useMoveMutation(options.queryKey, rows);
	const remove = useRemoveMutation(options.queryKey, rows);
	const duplicate = useDuplicateMutation(options.queryKey);
	const updateContent = useUpdateContentMutation(options.queryKey);
	const setType = useSetTypeMutation(options.queryKey);
	const setDueDate = useSetDueDateMutation(options.queryKey);
	const setIcon = useSetIconMutation(options.queryKey);
	const setRecurrence = useSetRecurrenceMutation(options.queryKey);
	const setTaskCompleted = useSetTaskCompletedMutation(options.queryKey);
	const setTags = useSetTagsMutation(options.queryKey);
	const { add, addAfter } = useCreateMutation(options.queryKey, rootId, rows);

	return {
		rows,
		toggle,
		move,
		remove,
		duplicate,
		updateContent,
		setType,
		setDueDate,
		setIcon,
		setRecurrence,
		setTaskCompleted,
		setTags,
		add,
		addAfter,
	};
}
