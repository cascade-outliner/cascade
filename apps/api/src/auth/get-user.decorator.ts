import type { AuthenticatedUser } from "@cascade/auth/token-validation";
import {
	createParamDecorator,
	type ExecutionContext,
	UnauthorizedException,
} from "@nestjs/common";
import type { AuthenticatedRequest } from "./authenticated-request";

export const GetUser = createParamDecorator(
	(_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
		const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
		if (!request.user) {
			throw new UnauthorizedException("Authenticated user is unavailable");
		}
		return request.user;
	},
);

export type { AuthenticatedUser };
