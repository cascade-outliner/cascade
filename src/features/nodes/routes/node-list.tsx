import type { QueryClient } from "@tanstack/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { orpc } from "#/orpc/client";
import { NodeTree } from "../components/node-tree";
import type { NodeWithMeta } from "../schema";

async function prefetchOpenChildren(
	queryClient: QueryClient,
	nodes: NodeWithMeta[],
): Promise<void> {
	const open = nodes.filter((n) => n.isOpen);
	if (!open.length) return;
	const childLists = await Promise.all(
		open.map((n) =>
			queryClient.ensureQueryData(
				orpc.getChildren.queryOptions({ input: { parentId: n.id } }),
			),
		),
	);
	await Promise.all(
		childLists.map((children) => prefetchOpenChildren(queryClient, children)),
	);
}

export const nodeListLoader = async ({
	context,
}: {
	context: { queryClient: QueryClient };
}) => {
	const roots = await context.queryClient.ensureQueryData(
		orpc.listNodes.queryOptions(),
	);
	await prefetchOpenChildren(context.queryClient, roots);
};

export function NodeListPage() {
	const { data } = useSuspenseQuery(orpc.listNodes.queryOptions());

	return (
		<div className="max-w-6xl mx-auto py-10">
			<NodeTree roots={data} withTransition />
		</div>
	);
}
