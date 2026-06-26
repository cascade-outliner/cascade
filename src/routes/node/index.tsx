import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { orpc } from "#/orpc/client";
import { NodeList } from "#/ui/patterns/node-list/node-list";

export const Route = createFileRoute("/node/")({
	loader: async ({ context }) => {
		await context.queryClient.ensureQueryData(orpc.listNodes.queryOptions());
	},
	component: NoteZoomPage,
});

function NoteZoomPage() {
	const { data } = useSuspenseQuery(orpc.listNodes.queryOptions());

	return (
		<div className="max-w-6xl mx-auto py-10">
			<NodeList nodes={data} />
		</div>
	);
}
