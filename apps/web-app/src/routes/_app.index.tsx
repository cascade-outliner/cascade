import { createFileRoute } from "@tanstack/react-router";
import { Outline } from "#/components/outline.tsx";

export const Route = createFileRoute("/_app/")({
	component: () => <Outline zoomedId={null} />,
});
