import type { Session } from "@cascade/auth/server";
import { ORPCError, os } from "@orpc/server";
import { auth } from "../auth";

export interface ORPCContext {
	request: Request;
	session: Session | null;
}

export async function createContext(request: Request): Promise<ORPCContext> {
	const session = await auth.api.getSession({ headers: request.headers });
	return { request, session };
}

export const base = os.$context<ORPCContext>();

export const authed = base.use(({ context, next }) => {
	if (!context.session) {
		throw new ORPCError("UNAUTHORIZED", { status: 401 });
	}
	return next({
		context: { user: context.session.user },
	});
});
