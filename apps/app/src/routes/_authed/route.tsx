import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getSession } from "@/auth/session";
import type { PremiumStatus } from "@/core/premium/premium.procedures";
import type { SettingsPatch } from "@/core/settings/settings-patch-schema";
import { orpc } from "@/orpc/client";
import { AppHeader } from "@/ui/header/AppHeader";
import { SettingsProvider } from "@/ui/settings-context";

export const Route = createFileRoute("/_authed")({
	beforeLoad: async () => {
		const session = await getSession();
		if (!session) {
			throw redirect({ to: "/login" });
		}
		return { user: session.user };
	},
	loader: async ({ context: { queryClient } }) => {
		const settings = await queryClient
			.ensureQueryData(orpc.settings.get.queryOptions())
			.catch((): SettingsPatch => ({}));
		const premium = await queryClient
			.ensureQueryData(orpc.premium.get.queryOptions())
			.catch((): PremiumStatus => ({ isPremium: false, grantedAt: null }));
		return { settings, premium };
	},
	component: AuthedLayout,
});

function AuthedLayout() {
	return (
		<SettingsProvider>
			<AppHeader />
			<Outlet />
		</SettingsProvider>
	);
}
