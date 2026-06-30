import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { sortByOrder } from "#/lib/node-sort";
import { orpc } from "#/orpc/client";
import { GenericErrorComponent } from "#/ui/ErrorComponent/GenericErrorComponent";
import { Node } from "#/ui/Nodes/node";

export const Route = createFileRoute("/")({
	errorComponent: GenericErrorComponent,
	component: () => {
		const { data } = useSuspenseQuery(
			orpc.listNodes.queryOptions({ input: { parentId: null } }),
		);

		return (
			<div className="max-w-6xl mx-auto py-32">
				{sortByOrder(data).map((node) => {
					return <Node key={node.id} node={node} />;
				})}
			</div>
		);
	},
});
