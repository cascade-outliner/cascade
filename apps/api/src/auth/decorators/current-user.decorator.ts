import type { Session } from "@cascade/auth/server";
import {
	createParamDecorator,
	type ExecutionContext,
	UnauthorizedException,
} from "@nestjs/common";
import { AuthenticatedRequest } from "../types/auth.types";

export const CurrentUser = createParamDecorator(
	(_data: unknown, context: ExecutionContext): Session["user"] => {
		const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
		if (!request.principal) throw new UnauthorizedException();

		return request.principal.user;
	},
);
