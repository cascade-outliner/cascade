import { CascadeLoader } from "@cascade/ui/cascade-loader";
import {
	createFileRoute,
	Outlet,
	redirect,
	useRouter,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { AppHeader } from "@/app/app-header";
import { getSession } from "@/features/auth/server/get-session";
import { OnboardingTour } from "@/features/onboarding/ui/onboarding-tour";
import type { PremiumStatus } from "@/features/premium/server/premium-procedures";
import { SettingsProvider } from "@/features/settings/client/settings-context";
import type { SettingsPatch } from "@/features/settings/model/settings.schema";
import { orpc } from "@/orpc/client";
import { Route as NodeSlugRoute } from "./$nodeSlug";

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
	pendingComponent: CascadeLoader,
	pendingMs: 0,
	pendingMinMs: 200,
	component: AuthedLayout,
});

function AuthedLayout() {
	const router = useRouter();

	// Warm the node-detail route's code-split component chunk once, right
	// after the authed shell mounts, instead of waiting for the router's
	// usual hover/touch "intent" preload. A node's focus dot is often the
	// very first click of a session (or a touch tap, which has no hover
	// phase to preload during) — without this, that first click has to wait
	// on a real network fetch for the chunk before it can render, which
	// shows up as a flash instead of a cross-fade.
	useEffect(() => {
		router.loadRouteChunk(NodeSlugRoute);
	}, [router]);

	return (
		<SettingsProvider>
			<AppHeader />
			<Outlet />
			<OnboardingTour />
		</SettingsProvider>
	);
}
