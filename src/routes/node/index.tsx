import type { QueryClient } from "@tanstack/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import type { NodeWithMeta } from "#/db/schema";
import { getSession } from "#/integrations/better-auth/auth.functions";
import { orpc } from "#/orpc/client";
import { NodeTree } from "#/ui/patterns/node-tree/node-tree";

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

export const Route = createFileRoute("/node/")({
	beforeLoad: async () => {
		const session = await getSession();
		if (!session) throw redirect({ to: "/" });
		return { user: session.user };
	},
	loader: async ({ context }) => {
		const roots = await context.queryClient.ensureQueryData(
			orpc.listNodes.queryOptions(),
		);
		await prefetchOpenChildren(context.queryClient, roots);
	},
	component: NoteZoomPage,
});

function NoteZoomPage() {
	const { data } = useSuspenseQuery(orpc.listNodes.queryOptions());

	return (
		<div className="max-w-6xl mx-auto py-10">
			<NodeTree roots={data} withTransition />
		</div>
	);
}
