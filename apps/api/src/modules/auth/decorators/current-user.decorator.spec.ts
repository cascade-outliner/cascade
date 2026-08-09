import type { ExecutionContext } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import type { RequestWithUser } from "../guards/session.guard";
import { currentUserFactory } from "./current-user.decorator";

function createExecutionContext(
	request: Partial<RequestWithUser>,
): ExecutionContext {
	return {
		switchToHttp: () => ({ getRequest: () => request }),
	} as unknown as ExecutionContext;
}

describe("@CurrentUser()", () => {
	it("returns the user SessionGuard attached to the request", () => {
		const user = { id: "user-1", email: "user@example.com" };
		const context = createExecutionContext({
			user,
		} as Partial<RequestWithUser>);

		expect(currentUserFactory(undefined, context)).toEqual(user);
	});
});
