import { createFileRoute, Outlet } from "@tanstack/react-router";
import { CommandMenu } from "#/components/command-menu.tsx";
import { loadOutline } from "#/lib/outline-store.tsx";

export const Route = createFileRoute("/_app")({
	loader: loadOutline,
	component: () => (
		<>
			<Outlet />
			<CommandMenu />
		</>
	),
});
