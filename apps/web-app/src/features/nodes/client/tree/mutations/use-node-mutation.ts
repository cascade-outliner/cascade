import type { QueryKey } from "@tanstack/react-query";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface OptimisticNodeMutationConfig<TVars, TData, TQueryData> {
	queryKey: QueryKey;
	mutationFn: (vars: TVars) => Promise<TData>;
	/** Applied to the cache in `onMutate`. Return `old` unchanged if there's nothing to patch. */
	patch: (old: TQueryData | undefined, vars: TVars) => TQueryData | undefined;
	onSuccess?: (data: TData, vars: TVars) => void;
	/** Defaults to invalidating `queryKey`, refetching the authoritative server state. */
	onError?: (vars: TVars) => void;
}

/**
 * A `useMutation` that optimistically patches a single query cache entry.
 * `onMutate` cancels in-flight fetches for `queryKey` first, so a refetch
 * landing mid-mutation can't clobber the optimistic write; failures fall
 * back to invalidating that entry unless a custom `onError` is given.
 */
export function useOptimisticNodeMutation<TVars, TData, TQueryData>({
	queryKey,
	mutationFn,
	patch,
	onSuccess,
	onError,
}: OptimisticNodeMutationConfig<TVars, TData, TQueryData>) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn,
		onMutate: async (vars: TVars) => {
			await queryClient.cancelQueries({ queryKey });
			queryClient.setQueryData<TQueryData>(queryKey, (old) => patch(old, vars));
		},
		onSuccess: (data, vars) => onSuccess?.(data, vars),
		onError: (_error, vars) =>
			onError ? onError(vars) : queryClient.invalidateQueries({ queryKey }),
	});
}
