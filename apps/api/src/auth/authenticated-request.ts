import type { AuthenticatedUser } from "@cascade/auth/token-validation";
import type { FastifyRequest } from "fastify";

export interface AuthenticatedRequest extends FastifyRequest {
	user?: AuthenticatedUser;
}
