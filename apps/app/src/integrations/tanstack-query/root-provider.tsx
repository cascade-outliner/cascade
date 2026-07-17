import { MutationCache, QueryClient } from "@tanstack/react-query";

export function getContext() {
	const queryClient = new QueryClient({
		mutationCache: new MutationCache({
			onError: (error) => {
				// TODO: Log error in platform for investigation
				console.error(error);
			},
		}),
	});

	return {
		queryClient,
	};
}
