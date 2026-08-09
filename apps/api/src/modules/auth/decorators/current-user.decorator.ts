import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { RequestWithUser, SessionUser } from "../guards/session.guard";

// Exported separately (rather than inlined in createParamDecorator) so it
// can be unit-tested directly, per NestJS's own recommended pattern for
// testing param decorators.
export function currentUserFactory(
	_data: unknown,
	ctx: ExecutionContext,
): SessionUser {
	const request = ctx.switchToHttp().getRequest<RequestWithUser>();
	return request.user;
}

/**
 * Pulls the user SessionGuard attached to the request, so controllers can
 * do `check(@CurrentUser() user: SessionUser)` instead of reaching into
 * the raw request.
 */
export const CurrentUser = createParamDecorator(currentUserFactory);
