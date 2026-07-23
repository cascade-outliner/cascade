import type { DueDateRange } from "@cascade/outliner/node-filters";
import type { VisibleTree } from "@cascade/outliner/tree-types";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
	useCreateMutation,
	useDuplicateMutation,
	useLoadMoreMutation,
	useMoveMutation,
	useRemoveMutation,
	useSetDueDateMutation,
	useSetTagsMutation,
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
 * shared `queryKey`; this hook only assembles their return values into the
 * `VisibleTree` shape consumers use.
 */
export function useVisibleTree(
	rootId: string | null,
	includeCollapsedDescendants = false,
	dueDateRange: DueDateRange | null = null,
): VisibleTree {
	const options = visibleTreeOptions(
		rootId,
		includeCollapsedDescendants,
		dueDateRange,
	);
	const { data } = useSuspenseQuery(options);

	const toggle = useToggleMutation(
		options.queryKey,
		includeCollapsedDescendants,
	);
	const move = useMoveMutation(options.queryKey);
	const remove = useRemoveMutation(options.queryKey);
	const duplicate = useDuplicateMutation(options.queryKey);
	const updateContent = useUpdateContentMutation(options.queryKey);
	const setType = useSetTypeMutation(options.queryKey);
	const setDueDate = useSetDueDateMutation(options.queryKey);
	const setTags = useSetTagsMutation(options.queryKey);
	const { add, addAfter } = useCreateMutation(
		options.queryKey,
		rootId,
		data.rows,
	);
	const loadMore = useLoadMoreMutation(
		options.queryKey,
		rootId,
		includeCollapsedDescendants,
		dueDateRange,
		data.nextCursor,
	);

	return {
		rows: data.rows,
		hasMore: data.nextCursor !== null,
		toggle,
		move,
		remove,
		duplicate,
		updateContent,
		setType,
		setDueDate,
		setTags,
		add,
		addAfter,
		loadMore,
	};
}
