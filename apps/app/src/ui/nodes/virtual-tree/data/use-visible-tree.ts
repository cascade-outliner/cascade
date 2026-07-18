import type { VisibleTree } from "@cascade/outliner/tree-types";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useCreateMutation } from "./mutations/use-create-mutation";
import { useLoadMoreMutation } from "./mutations/use-load-more-mutation";
import { useMoveMutation } from "./mutations/use-move-mutation";
import { useRemoveMutation } from "./mutations/use-remove-mutation";
import { useSetDueDateMutation } from "./mutations/use-set-due-date-mutation";
import { useSetTagsMutation } from "./mutations/use-set-tags-mutation";
import { useSetTypeMutation } from "./mutations/use-set-type-mutation";
import { useToggleMutation } from "./mutations/use-toggle-mutation";
import { useUpdateContentMutation } from "./mutations/use-update-content-mutation";
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
): VisibleTree {
	const options = visibleTreeOptions(rootId, includeCollapsedDescendants);
	const { data } = useSuspenseQuery(options);

	const toggle = useToggleMutation(
		options.queryKey,
		includeCollapsedDescendants,
	);
	const move = useMoveMutation(options.queryKey);
	const remove = useRemoveMutation(options.queryKey);
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
		data.nextCursor,
	);

	return {
		rows: data.rows,
		hasMore: data.nextCursor !== null,
		toggle,
		move,
		remove,
		updateContent,
		setType,
		setDueDate,
		setTags,
		add,
		addAfter,
		loadMore,
	};
}
