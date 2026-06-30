import { type QueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { orpc } from "#/orpc/client";
import { GenericErrorComponent } from "#/ui/ErrorComponent/GenericErrorComponent";
import { Node } from "#/ui/Nodes/node";

export const nodeListLoader = async ({
	context,
}: {
	context: { queryClient: QueryClient };
}) => {
	return await context.queryClient.ensureQueryData(
		orpc.listNodes.queryOptions(),
	);
};

export const Route = createFileRoute("/")({
	errorComponent: GenericErrorComponent,
	component: () => {
		const { data } = useSuspenseQuery(orpc.listNodes.queryOptions());

		return (
			<div className="max-w-6xl mx-auto py-32">
				{data.map((node) => {
					return <Node key={node.id} node={node} />;
				})}
			</div>
		);
	},
});
