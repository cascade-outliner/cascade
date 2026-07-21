import { insertSubtreeAfter } from "@cascade/outliner/visible-rows";
import { toast } from "@cascade/ui/toast";
import type { QueryKey } from "@tanstack/react-query";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { m } from "#/paraglide/messages.js";
import { client } from "@/orpc/client";
import { makeSetRows } from "../cache-helpers";
import { fetchFullSubtree } from "../fetch-full-subtree";
import type { VisibleTreeData } from "../types";

export function useDuplicateMutation(queryKey: QueryKey) {
	const queryClient = useQueryClient();
	const setRows = makeSetRows(queryClient, queryKey);

	const mutation = useMutation({
		mutationFn: (vars: { id: string }) => client.nodes.duplicate(vars),
	});

	return async (id: string) => {
		const source = queryClient
			.getQueryData<VisibleTreeData>(queryKey)
			?.rows.find((r) => r.id === id);
		if (!source) return;

		let created: Awaited<ReturnType<typeof mutation.mutateAsync>>;
		try {
			created = await mutation.mutateAsync({ id });
		} catch {
			toast.error(m.node_duplicate_failed());
			return;
		}

		const descendants = created.hasChildren
			? await fetchFullSubtree(created.id)
			: [];

		await queryClient.cancelQueries({ queryKey });
		setRows((currentRows) =>
			insertSubtreeAfter(
				currentRows,
				id,
				{
					id: created.id,
					parentId: created.parentId,
					content: created.content,
					type: created.type,
					metadata: created.metadata,
					expanded: created.expanded,
					order: created.order,
					dueDate: created.dueDate,
					tags: created.tags,
					depth: source.depth,
					path: [...source.path.slice(0, -1), created.order],
					hasChildren: created.hasChildren,
					isLastChild: source.isLastChild,
				},
				descendants,
			),
		);
		toast.success(m.node_duplicated());
	};
}
