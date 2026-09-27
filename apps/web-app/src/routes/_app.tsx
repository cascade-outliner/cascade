import { createFileRoute, Outlet } from "@tanstack/react-router";
import { CommandMenu } from "#/components/command-menu.tsx";
import { loadOutline } from "#/lib/outline-store.tsx";

export const Route = createFileRoute("/_app")({
	ssr: false,
	loader: loadOutline,
	component: () => (
		<>
			<Outlet />
			<CommandMenu />
		</>
	),
});
