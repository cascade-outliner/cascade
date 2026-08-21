import { os } from "@orpc/server";
import type { ORPCContext } from "./context.ts";

export const authed = os
	.$context<ORPCContext>()
	.errors({ UNAUTHORIZED: {} })
	.use(({ context, next, errors }) => {
		if (!context.session) {
			throw errors.UNAUTHORIZED();
		}

		return next({ context: { userId: context.session.user.id } });
	});
