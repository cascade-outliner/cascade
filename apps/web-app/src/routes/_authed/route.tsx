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

// Session checks go through the query client (with a staleTime) rather than
// a bare `getSession()` call, because `beforeLoad` isn't subject to a
// route's `staleTime` option the way `loader` is — it re-runs on every
// single in-app navigation, including between sibling routes that stay
// under this same authed layout (e.g. clicking a node's focus dot). Without
// this cache, every one of those navigations paid for a real network round
// trip before it could even start rendering, gated by pendingMs/pendingMinMs
// below. A revoked session still gets caught within this window, or the
// moment an API call itself returns unauthorized.
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
	// The router's default staleTime (0) would otherwise also re-run this
	// loader's settings/premium fetch on every in-app navigation.
	staleTime: 5 * 60 * 1000,
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
