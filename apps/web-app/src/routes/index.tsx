import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
	return (
		<div className="p-8 flex flex-col gap-2">
			<Link to="/dashboard">Dashboard</Link>
		</div>
	);
}
