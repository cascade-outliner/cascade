import { patchRow } from "@cascade/outliner/visible-rows";
import { toast } from "@cascade/ui/toast";
import type { QueryKey } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { m } from "#/paraglide/messages.js";
import { useOptimisticNodeMutation } from "@/features/nodes/client/tree/mutations/use-node-mutation";
import { undoStore } from "@/features/nodes/client/undo/undo-store";
import { client, orpc } from "@/orpc/client";
import { patchRows } from "../cache-helpers";
import type { VisibleTreeData } from "../tree-data.types";

export function useUpdateContentMutation(queryKey: QueryKey) {
	const queryClient = useQueryClient();

	const mutation = useOptimisticNodeMutation<
		{ id: string; content: { root: unknown } | null },
		void,
		VisibleTreeData
	>({
		queryKey,
		mutationFn: (vars) => client.nodes.updateContent(vars),
		patch: (old, { id, content }) =>
			patchRows((rows) => patchRow(rows, id, { content }), old),
		onSuccess: (_data, { id }) => {
			// Bust breadcrumbs, but only for chains the edited node is actually
			// part of, rather than every ancestors cache entry.
			queryClient.invalidateQueries({
				queryKey: orpc.nodes.ancestors.key(),
				predicate: (query) => {
					const chain = query.state.data as { id: string }[] | undefined;
					return chain?.some((ancestor) => ancestor.id === id) ?? false;
				},
			});
		},
		onError: () => {
			toast.error(m.node_save_failed());
			queryClient.invalidateQueries({ queryKey });
		},
	});

	// Content coming off the cache can genuinely be `null` — a freshly created,
	// never-yet-saved node — and undoing back to exactly that state (not just
	// an empty document) needs to round-trip through updateContent too, so
	// this accepts null even though real edits (the exposed function below)
	// never produce one; Lexical always serializes to a real document.
	const rawUpdateContent = (id: string, content: { root: unknown } | null) =>
		mutation.mutate({ id, content });

	return (id: string, content: { root: unknown }) => {
		const rows = queryClient.getQueryData<VisibleTreeData>(queryKey)?.rows;
		const previousContent = rows?.find((row) => row.id === id)?.content as
			| { root: unknown }
			| null
			| undefined;

		rawUpdateContent(id, content);

		if (previousContent !== undefined) {
			undoStore.push({
				undo: () => rawUpdateContent(id, previousContent),
				redo: () => rawUpdateContent(id, content),
			});
		}
	};
}
