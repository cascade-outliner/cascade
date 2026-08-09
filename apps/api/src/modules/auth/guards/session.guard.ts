import type { Session } from "@cascade/auth/server";
import {
	type CanActivate,
	type ExecutionContext,
	Inject,
	Injectable,
	UnauthorizedException,
} from "@nestjs/common";
// biome-ignore lint/style/useImportType: Reflector is constructor-injected; emitDecoratorMetadata needs the real runtime binding, not an erased type-only import.
import { Reflector } from "@nestjs/core";
import type { FastifyRequest } from "fastify";
import { IS_PUBLIC_KEY } from "../../../common/decorators/public.decorator";
import { AUTH, type AuthInstance } from "../auth.provider";

export type SessionUser = Session["user"];

export type RequestWithUser = FastifyRequest & { user: SessionUser };

function toFetchHeaders(rawHeaders: FastifyRequest["headers"]): Headers {
	const headers = new Headers();
	for (const [key, value] of Object.entries(rawHeaders)) {
		if (value === undefined) {
			continue;
		}
		if (Array.isArray(value)) {
			for (const item of value) {
				headers.append(key, item);
			}
		} else {
			headers.append(key, value);
		}
	}
	return headers;
}

/**
 * Verifies the same better-auth session apps/web-app issues — see
 * ARCHITECTURE.md's "Auth: shared session, not a second login". Never
 * issues sessions itself.
 */
@Injectable()
export class SessionGuard implements CanActivate {
	constructor(
		@Inject(AUTH) private readonly auth: AuthInstance,
		private readonly reflector: Reflector,
	) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
			context.getHandler(),
			context.getClass(),
		]);
		if (isPublic) {
			return true;
		}

		const request = context.switchToHttp().getRequest<RequestWithUser>();
		const session = await this.auth.api.getSession({
			headers: toFetchHeaders(request.headers),
		});

		if (!session) {
			throw new UnauthorizedException();
		}

		request.user = session.user;
		return true;
	}
}
