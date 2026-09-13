import { createFileRoute } from "@tanstack/react-router";
import { Outline } from "#/components/outline.tsx";

export const Route = createFileRoute("/_app/node/$id")({
	component: RouteComponent,
});

function RouteComponent() {
	const { id } = Route.useParams();
	return <Outline zoomedId={id} />;
}
