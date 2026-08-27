import { auth } from "@cascade/auth";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { StoreProvider } from "#/context/store-context.tsx";

const getSession = createServerFn({ method: "GET" }).handler(() =>
	auth.api.getSession({ headers: getRequest().headers }),
);

export const Route = createFileRoute("/_authenticated")({
	beforeLoad: async () => {
		const session = await getSession();
		if (!session) {
			throw redirect({ to: "/login" });
		}
		return { session };
	},
	component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
	const { session } = Route.useRouteContext();

	return (
		<StoreProvider
			userId={session.user.id}
			fallback={<div className="p-8 text-muted">Loading…</div>}
		>
			<Outlet />
		</StoreProvider>
	);
}
