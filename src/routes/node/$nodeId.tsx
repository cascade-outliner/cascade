import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { getSession } from "#/integrations/better-auth/auth.functions";
import { orpc } from "#/orpc/client";
import { NodeTree } from "#/ui/patterns/node-tree/node-tree";

export const Route = createFileRoute("/node/$nodeId")({
	beforeLoad: async () => {
		const session = await getSession();
		if (!session) throw redirect({ to: "/" });
		return { user: session.user };
	},
	loader: async ({ context, params }) => {
		await context.queryClient.ensureQueryData(
			orpc.getNode.queryOptions({ input: { id: params.nodeId } }),
		);
	},
	component: NoteZoomPage,
});

function NoteZoomPage() {
	const { nodeId } = Route.useParams();
	const { data } = useSuspenseQuery(
		orpc.getNode.queryOptions({ input: { id: nodeId } }),
	);

	return (
		<div className="max-w-6xl mx-auto py-10">
			<div
				className="text-xl font-semibold mb-4 inline-flex"
				style={{ viewTransitionName: `node-text-${nodeId}` }}
			>
				{data.text}
			</div>
			<NodeTree roots={data.children} withTransition />
		</div>
	);
}
