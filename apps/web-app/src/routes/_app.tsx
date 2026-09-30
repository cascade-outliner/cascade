import { createFileRoute, Outlet } from "@tanstack/react-router";
import { CommandMenu } from "#/components/command-menu.tsx";
import { featureFlags, type ServerFlags } from "#/lib/feature-flags/index.ts";
import { loadOutline } from "#/lib/outline-store.tsx";
import { getFeatureFlags } from "#/server/feature-flags.ts";

let flags: Promise<ServerFlags | null> | undefined;

export const Route = createFileRoute("/_app")({
	ssr: false,
	loader: async () => {
		flags ??= getFeatureFlags()
			.then((server) => {
				featureFlags().setServerFlags(server);
				return server;
			})
			.catch((error) => {
				console.error("Feature flags: could not reach the server", error);
				return null;
			});
		await Promise.all([loadOutline(), flags, featureFlags().load()]);
	},
	component: () => (
		<>
			<Outlet />
			<CommandMenu />
		</>
	),
});
