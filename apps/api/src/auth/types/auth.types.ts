import type { IncomingHttpHeaders } from "node:http";
import type { Session } from "@cascade/auth/server";

export type AuthPrincipal = Session;

export interface AuthenticatedRequest {
	headers: IncomingHttpHeaders;
	principal?: AuthPrincipal;
}

export interface SessionResolver {
	api: {
		getSession(input: { headers: Headers }): Promise<AuthPrincipal | null>;
	};
}
