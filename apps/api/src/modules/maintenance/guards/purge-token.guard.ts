import { timingSafeEqual } from "node:crypto";
import {
	type CanActivate,
	type ExecutionContext,
	Injectable,
	ServiceUnavailableException,
	UnauthorizedException,
} from "@nestjs/common";
import type { FastifyRequest } from "fastify";

function tokenMatches(
	authorization: string | undefined,
	expected: string,
): boolean {
	const prefix = "Bearer ";
	if (!authorization?.startsWith(prefix)) {
		return false;
	}
	const actualBuffer = Buffer.from(authorization.slice(prefix.length));
	const expectedBuffer = Buffer.from(expected);
	return (
		actualBuffer.length === expectedBuffer.length &&
		timingSafeEqual(actualBuffer, expectedBuffer)
	);
}

/**
 * Bearer-token guard for the maintenance endpoints, same
 * TREE_HISTORY_PURGE_TOKEN (32+-char-secret) convention as
 * apps/web-app's POST /api/maintenance/purge-tree-history. Deliberately
 * not SessionGuard — this is an ops/cron target, not a logged-in user, so
 * routes it protects are also marked @Public() to bypass SessionGuard.
 */
@Injectable()
export class PurgeTokenGuard implements CanActivate {
	canActivate(context: ExecutionContext): boolean {
		const configuredToken = process.env.TREE_HISTORY_PURGE_TOKEN;
		if (!configuredToken) {
			throw new ServiceUnavailableException(
				"Tree history purge API is not configured",
			);
		}

		const request = context.switchToHttp().getRequest<FastifyRequest>();
		if (!tokenMatches(request.headers.authorization, configuredToken)) {
			throw new UnauthorizedException();
		}

		return true;
	}
}
