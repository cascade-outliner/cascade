import { createFileRoute, Outlet } from "@tanstack/react-router";
import { CommandMenu } from "#/components/command-menu.tsx";
import { loadOutline } from "#/lib/outline-store.tsx";
import { getAiConfig } from "#/server/split.ts";

// Memoized: the loader re-runs on navigation.
let ai: Promise<{ enabled: boolean }> | undefined;

export const Route = createFileRoute("/_app")({
	ssr: false,
	loader: async () => {
		ai ??= getAiConfig().catch(() => ({ enabled: false }));
		const [, { enabled }] = await Promise.all([loadOutline(), ai]);
		return { aiEnabled: enabled };
	},
	component: () => (
		<>
			<Outlet />
			<CommandMenu />
		</>
	),
});
