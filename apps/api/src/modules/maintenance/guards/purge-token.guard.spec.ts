import type { ExecutionContext } from "@nestjs/common";
import {
	ServiceUnavailableException,
	UnauthorizedException,
} from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PurgeTokenGuard } from "./purge-token.guard";

function createExecutionContext(
	request: Partial<FastifyRequest>,
): ExecutionContext {
	return {
		switchToHttp: () => ({
			getRequest: () => request,
		}),
	} as unknown as ExecutionContext;
}

describe("PurgeTokenGuard", () => {
	const originalToken = process.env.TREE_HISTORY_PURGE_TOKEN;
	const token = "tree-history-test-token-32-characters";
	let guard: PurgeTokenGuard;

	beforeEach(() => {
		guard = new PurgeTokenGuard();
	});

	afterEach(() => {
		process.env.TREE_HISTORY_PURGE_TOKEN = originalToken;
	});

	it("throws ServiceUnavailableException when no token is configured", () => {
		process.env.TREE_HISTORY_PURGE_TOKEN = undefined;
		delete process.env.TREE_HISTORY_PURGE_TOKEN;

		const context = createExecutionContext({ headers: {} });

		expect(() => guard.canActivate(context)).toThrow(
			ServiceUnavailableException,
		);
	});

	it("throws UnauthorizedException when the bearer token doesn't match", () => {
		process.env.TREE_HISTORY_PURGE_TOKEN = token;

		const context = createExecutionContext({
			headers: { authorization: "Bearer wrong-token" },
		});

		expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
	});

	it("throws UnauthorizedException when the authorization header is missing", () => {
		process.env.TREE_HISTORY_PURGE_TOKEN = token;

		const context = createExecutionContext({ headers: {} });

		expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
	});

	it("allows the request when the bearer token matches", () => {
		process.env.TREE_HISTORY_PURGE_TOKEN = token;

		const context = createExecutionContext({
			headers: { authorization: `Bearer ${token}` },
		});

		expect(guard.canActivate(context)).toBe(true);
	});
});
