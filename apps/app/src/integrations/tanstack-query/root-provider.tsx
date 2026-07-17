import { MutationCache, QueryClient } from "@tanstack/react-query";

export function getContext() {
	const queryClient = new QueryClient({
		// Safety net so a mutation that forgets its own onError doesn't fail
		// silently; per-mutation onError handlers (toast, rollback) still run
		// separately, since TanStack calls both the cache-level and local ones.
		mutationCache: new MutationCache({
			onError: (error) => {
				console.error(error);
			},
		}),
	});

	return {
		queryClient,
	};
}
