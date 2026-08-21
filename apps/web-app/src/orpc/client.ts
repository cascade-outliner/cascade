import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { RouterClient } from "@orpc/server";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import type { router } from "./router.ts";

const getOrigin = createIsomorphicFn()
	.server(() => new URL(getRequest().url).origin)
	.client(() => window.location.origin);

export const client: RouterClient<typeof router> = createORPCClient(
	new RPCLink({ url: () => `${getOrigin()}/api/rpc` }),
);

export const orpc = createTanstackQueryUtils(client);
