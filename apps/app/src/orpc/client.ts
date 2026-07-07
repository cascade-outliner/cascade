import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { RouterClient } from "@orpc/server";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

import type router from "@/orpc/router";

const getLink = createIsomorphicFn()
	.server(
		() =>
			new RPCLink({
				// env module would leak into the client bundle here, so read PORT directly
				url: `http://localhost:${process.env.PORT ?? 3000}/api/rpc`,
				// Forward the browser's cookies so the RPC handler sees the session
				// during SSR.
				headers: () => {
					const cookie = getRequest().headers.get("cookie");
					return cookie ? { cookie } : {};
				},
			}),
	)
	.client(() => new RPCLink({ url: `${window.location.origin}/api/rpc` }));

export const client = createORPCClient<RouterClient<typeof router>>(getLink());

export const orpc = createTanstackQueryUtils(client);
