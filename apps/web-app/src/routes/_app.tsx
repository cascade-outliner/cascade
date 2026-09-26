import { createFileRoute, Outlet } from "@tanstack/react-router";
import { CommandMenu } from "#/components/command-menu.tsx";
import { OutlineStoreProvider } from "#/lib/outline-store.tsx";

export const Route = createFileRoute("/_app")({
	component: () => (
		<OutlineStoreProvider>
			<Outlet />
			<CommandMenu />
		</OutlineStoreProvider>
	),
});
