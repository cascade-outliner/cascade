import { CascadeLoader } from "@cascade/ui/cascade-loader";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppHeader } from "@/app/app-header";
import { HeaderBreadcrumbSlotProvider } from "@/app/header-breadcrumb-slot";
import { getSession } from "@/features/auth/server/get-session";
import { DueDateNotificationsProvider } from "@/features/nodes/client/notifications/due-date-notifications-provider";
import { OnboardingTour } from "@/features/onboarding/ui/onboarding-tour";
import type { PremiumStatus } from "@/features/premium/server/premium-procedures";
import { SettingsProvider } from "@/features/settings/client/settings-context";
import type { SettingsPatch } from "@/features/settings/model/settings.schema";
import { orpc } from "@/orpc/client";

function sessionOptions() {
	return {
		queryKey: ["session"],
		queryFn: () => getSession(),
		staleTime: 60_000,
	};
}

export const Route = createFileRoute("/_authed")({
	beforeLoad: async ({ context: { queryClient } }) => {
		const session = await queryClient.ensureQueryData(sessionOptions());
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
	staleTime: 5 * 60 * 1000,
	pendingComponent: CascadeLoader,
	pendingMs: 0,
	pendingMinMs: 200,
	component: AuthedLayout,
});

function AuthedLayout() {
	return (
		<SettingsProvider>
			<DueDateNotificationsProvider />
			<HeaderBreadcrumbSlotProvider>
				<AppHeader />
				<Outlet />
			</HeaderBreadcrumbSlotProvider>
			<OnboardingTour />
		</SettingsProvider>
	);
}
