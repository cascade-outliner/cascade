import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppHeader } from "@/app/app-header";
import { getSession } from "@/features/auth/server/get-session";
import type { PremiumStatus } from "@/features/premium/server/premium-procedures";
import { SettingsProvider } from "@/features/settings/client/settings-context";
import type { SettingsPatch } from "@/features/settings/model/settings.schema";
import { orpc } from "@/orpc/client";

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
