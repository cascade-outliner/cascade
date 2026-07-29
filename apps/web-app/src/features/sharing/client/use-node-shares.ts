import { toast } from "@cascade/ui/toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { m } from "#/paraglide/messages.js";
import { orpc } from "@/orpc/client";

export function useNodeShares(nodeId: string, enabled: boolean) {
	return useQuery({
		...orpc.sharing.list.queryOptions({ input: { nodeId } }),
		enabled,
	});
}

export function useCreateShare(nodeId: string) {
	const queryClient = useQueryClient();
	const queryOptions = orpc.sharing.list.queryOptions({ input: { nodeId } });
	const mutation = useMutation(
		orpc.sharing.create.mutationOptions({
			onSuccess: (share) => {
				queryClient.setQueryData(queryOptions.queryKey, (shares) => [
					share,
					...(shares ?? []),
				]);
			},
			onError: () => toast.error(m.sharing_create_failed()),
		}),
	);

	return {
		createShare: (requireLogin: boolean) =>
			mutation.mutateAsync({ nodeId, requireLogin }),
		isCreating: mutation.isPending,
	};
}

export function useRevokeShare(nodeId: string) {
	const queryClient = useQueryClient();
	const queryOptions = orpc.sharing.list.queryOptions({ input: { nodeId } });
	const mutation = useMutation(
		orpc.sharing.revoke.mutationOptions({
			onSuccess: (_result, input) => {
				queryClient.setQueryData(queryOptions.queryKey, (shares) =>
					shares?.map((share) =>
						share.id === input.id ? { ...share, revokedAt: new Date() } : share,
					),
				);
				toast.success(m.sharing_link_revoked());
			},
			onError: () => toast.error(m.sharing_revoke_failed()),
		}),
	);

	return {
		revokeShare: (id: string) => mutation.mutate({ id }),
		revokingId: mutation.isPending ? mutation.variables?.id : undefined,
	};
}

export function sharedTreeUrl(token: string) {
	return `${window.location.origin}/shared/${token}`;
}
