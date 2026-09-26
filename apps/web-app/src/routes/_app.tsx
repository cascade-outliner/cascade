import { createFileRoute, Outlet } from "@tanstack/react-router";
import { CommandMenu } from "#/components/command-menu.tsx";
import { DevSeedToolbar } from "#/components/dev-seed-toolbar.tsx";
import { OutlineStoreProvider } from "#/lib/outline-store.tsx";

export const Route = createFileRoute("/_app")({
	component: () => (
		<OutlineStoreProvider>
			<Outlet />
			<DevSeedToolbar />
			<CommandMenu />
		</OutlineStoreProvider>
	),
});
