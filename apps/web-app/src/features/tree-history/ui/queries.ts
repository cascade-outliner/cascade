import { toast } from "@cascade/ui/toast";
import {
	useInfiniteQuery,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import { m } from "#/paraglide/messages.js";
import type { TreeHistoryCursor } from "@/features/tree-history/model/tree-history.schema";
import { client, orpc } from "@/orpc/client";

export function useTreeHistoryTimeline(enabled: boolean) {
	return useInfiniteQuery({
		queryKey: orpc.treeHistory.list.key(),
		queryFn: ({ pageParam }) =>
			client.treeHistory.list({ cursor: pageParam, limit: 50 }),
		initialPageParam: null as TreeHistoryCursor | null,
		getNextPageParam: (page) => page.nextCursor,
		enabled,
	});
}

export function useTreeHistoryDetail(id: string | undefined, enabled: boolean) {
	return useQuery({
		...orpc.treeHistory.get.queryOptions({ input: { id: id as string } }),
		enabled: enabled && !!id,
	});
}

export function useRestoreTreeHistory() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (id: string) => client.treeHistory.restore({ id }),
		onSuccess: async () => {
			toast.success(m.tree_history_restore_success());
			await Promise.all([
				queryClient.invalidateQueries({
					queryKey: orpc.treeHistory.list.key(),
				}),
				queryClient.invalidateQueries({ queryKey: orpc.treeHistory.get.key() }),
				queryClient.invalidateQueries({
					queryKey: orpc.nodes.visibleTree.key(),
				}),
				queryClient.invalidateQueries({ queryKey: orpc.nodes.get.key() }),
				queryClient.invalidateQueries({ queryKey: orpc.nodes.ancestors.key() }),
				queryClient.invalidateQueries({ queryKey: orpc.nodes.listTags.key() }),
			]);
		},
		onError: () => toast.error(m.tree_history_restore_failed()),
	});
}
