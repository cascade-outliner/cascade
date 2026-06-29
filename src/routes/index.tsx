import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
	component: () => {
		return <p>Hello World</p>;
	},
});
