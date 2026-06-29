import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/node/$nodeId")({
	component: () => {
		return <p>Node Detail Page</p>;
	},
});
