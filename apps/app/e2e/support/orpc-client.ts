import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { RouterClient } from "@orpc/server";
import type { BrowserContext } from "@playwright/test";
import type router from "@/orpc/router";
import { env } from "./env";

export type OrpcClient = RouterClient<typeof router>;

async function cookieHeaderFor(context: BrowserContext): Promise<string> {
	const cookies = await context.cookies();
	return cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join("; ");
}

export function createOrpcClient(context: BrowserContext): OrpcClient {
	const link = new RPCLink({
		url: `${env.appUrl}/api/rpc`,
		headers: async () => {
			const cookie = await cookieHeaderFor(context);
			return cookie ? { cookie } : {};
		},
	});
	return createORPCClient(link);
}
