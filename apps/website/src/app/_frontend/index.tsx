import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_frontend/")({
	component: HomePage,
	head: () => ({
		meta: [{ title: "Cascade" }],
	}),
});

function HomePage() {
	return (
		<div>
			<p className="text-4xl font-bold underline">Hello World...</p>
		</div>
	);
}
