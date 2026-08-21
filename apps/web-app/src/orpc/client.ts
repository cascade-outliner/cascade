import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { createRouterClient, type RouterClient } from "@orpc/server";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createContext } from "./context.ts";
import { router } from "./router.ts";

const getORPCClient = createIsomorphicFn()
	.server(() =>
		createRouterClient(router, {
			context: () => createContext({ request: getRequest() }),
		}),
	)
	.client(() =>
		createORPCClient<RouterClient<typeof router>>(
			new RPCLink({ url: `${window.location.origin}/api/rpc` }),
		),
	);

export const client: RouterClient<typeof router> = getORPCClient();

export const orpc = createTanstackQueryUtils(client);
