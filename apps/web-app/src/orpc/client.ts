import { createIsomorphicFn } from "@tanstack/react-start";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { createRouterClient, type RouterClient } from "@orpc/server";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { router } from "./router.ts";

const getORPCClient = createIsomorphicFn()
	.server(() => createRouterClient(router))
	.client(() =>
		createORPCClient<RouterClient<typeof router>>(
			new RPCLink({ url: `${window.location.origin}/api/rpc` }),
		),
	);

export const client: RouterClient<typeof router> = getORPCClient();

export const orpc = createTanstackQueryUtils(client);
