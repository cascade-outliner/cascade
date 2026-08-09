import type { ExecutionContext } from "@nestjs/common";
import { UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Test } from "@nestjs/testing";
import type { FastifyRequest } from "fastify";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { IS_PUBLIC_KEY } from "../../../common/decorators/public.decorator";
import { AUTH, type AuthInstance } from "../auth.provider";
import { type RequestWithUser, SessionGuard } from "./session.guard";

function createExecutionContext(
	request: Partial<FastifyRequest>,
): ExecutionContext {
	const handler = () => undefined;
	class TestController {}

	return {
		switchToHttp: () => ({
			getRequest: () => request,
		}),
		getHandler: () => handler,
		getClass: () => TestController,
	} as unknown as ExecutionContext;
}

describe("SessionGuard", () => {
	const getSession = vi.fn();
	const fakeAuth = { api: { getSession } } as unknown as AuthInstance;

	let guard: SessionGuard;
	let reflector: Reflector;

	beforeEach(async () => {
		getSession.mockReset();

		const moduleRef = await Test.createTestingModule({
			providers: [
				SessionGuard,
				Reflector,
				{ provide: AUTH, useValue: fakeAuth },
			],
		}).compile();

		guard = moduleRef.get(SessionGuard);
		reflector = moduleRef.get(Reflector);
	});

	it("allows a request with a valid session and attaches the user", async () => {
		const sessionUser = { id: "user-1", email: "user@example.com" };
		getSession.mockResolvedValue({
			user: sessionUser,
			session: { id: "session-1" },
		});

		const request: Partial<RequestWithUser> = { headers: { cookie: "a=b" } };
		const context = createExecutionContext(request);

		await expect(guard.canActivate(context)).resolves.toBe(true);
		expect(request.user).toEqual(sessionUser);
		expect(getSession).toHaveBeenCalledWith({ headers: expect.any(Headers) });
	});

	it("rejects a request with no session", async () => {
		getSession.mockResolvedValue(null);

		const context = createExecutionContext({ headers: {} });

		await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
			UnauthorizedException,
		);
	});

	it("bypasses session verification when the route is @Public()", async () => {
		vi.spyOn(reflector, "getAllAndOverride").mockReturnValue(true);

		const context = createExecutionContext({ headers: {} });

		await expect(guard.canActivate(context)).resolves.toBe(true);
		expect(getSession).not.toHaveBeenCalled();
	});

	it("reads the IS_PUBLIC_KEY metadata key", async () => {
		const spy = vi.spyOn(reflector, "getAllAndOverride").mockReturnValue(false);
		getSession.mockResolvedValue({
			user: { id: "user-1" },
			session: { id: "session-1" },
		});

		const context = createExecutionContext({ headers: {} });
		await guard.canActivate(context);

		expect(spy).toHaveBeenCalledWith(IS_PUBLIC_KEY, expect.any(Array));
	});
});
