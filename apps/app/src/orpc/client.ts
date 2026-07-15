import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { RouterClient } from "@orpc/server";
import { createRouterClient } from "@orpc/server";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

import type router from "@/orpc/router";

type Router = typeof router;

/**
 * In-process call: skips the localhost HTTP round-trip an RPCLink would
 * otherwise make during SSR, while still resolving the session per call from
 * the real incoming request. The router and its context (drizzle, better-auth,
 * ...) are loaded via dynamic import so this server-only branch never pulls
 * that code into the client bundle.
 */
function createServerClient(): RouterClient<Router> {
	let routerClient: Promise<RouterClient<Router>> | undefined;
	const resolve = () => {
		routerClient ??= Promise.all([
			import("@/orpc/context"),
			import("@/orpc/router"),
		]).then(([{ createContext }, { default: router }]) =>
			createRouterClient(router, {
				context: () => createContext(getRequest()),
			}),
		);
		return routerClient;
	};

	const proxy = (path: string[]): unknown =>
		new Proxy(() => {}, {
			get: (_target, prop) =>
				typeof prop === "string" ? proxy([...path, prop]) : undefined,
			apply: async (_target, _thisArg, args) => {
				let target: unknown = await resolve();
				for (const key of path) {
					target = (target as Record<string, unknown>)[key];
				}
				return (target as (...args: unknown[]) => unknown)(...args);
			},
		});

	return proxy([]) as RouterClient<Router>;
}

const getClient = createIsomorphicFn()
	.server(createServerClient)
	.client(() =>
		createORPCClient<RouterClient<Router>>(
			new RPCLink({ url: `${window.location.origin}/api/rpc` }),
		),
	);

export const client: RouterClient<Router> = getClient();

export const orpc = createTanstackQueryUtils(client);
