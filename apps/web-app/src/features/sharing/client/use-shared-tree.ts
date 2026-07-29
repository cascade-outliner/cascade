import { useInfiniteQuery } from "@tanstack/react-query";
import { client } from "@/orpc/client";

export function useSharedTree(token: string) {
	return useInfiniteQuery({
		queryKey: ["sharedTree", token],
		queryFn: ({ pageParam }: { pageParam: string[] | null }) =>
			client.sharedTree.get({ token, cursor: pageParam, limit: 500 }),
		initialPageParam: null as string[] | null,
		getNextPageParam: (page) => page.nextCursor,
	});
}
