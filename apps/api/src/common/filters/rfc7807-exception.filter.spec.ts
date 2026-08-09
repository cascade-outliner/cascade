import type { ArgumentsHost } from "@nestjs/common";
import { BadRequestException, ConflictException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { Rfc7807ExceptionFilter } from "./rfc7807-exception.filter";

function createReplyMock() {
	const reply = {
		status: vi.fn(),
		header: vi.fn(),
		send: vi.fn(),
	};
	reply.status.mockReturnValue(reply);
	reply.header.mockReturnValue(reply);
	reply.send.mockReturnValue(reply);
	return reply;
}

function createHost(
	url: string,
	reply: ReturnType<typeof createReplyMock>,
): ArgumentsHost {
	return {
		switchToHttp: () => ({
			getResponse: () => reply,
			getRequest: () => ({ url }),
		}),
	} as unknown as ArgumentsHost;
}

describe("Rfc7807ExceptionFilter", () => {
	it("formats a BadRequestException (e.g. from the global ValidationPipe)", () => {
		const filter = new Rfc7807ExceptionFilter();
		const reply = createReplyMock();

		filter.catch(
			new BadRequestException([
				"title must not be empty",
				"dueDate must be a valid date",
			]),
			createHost("/v1/nodes", reply),
		);

		expect(reply.status).toHaveBeenCalledWith(400);
		expect(reply.header).toHaveBeenCalledWith(
			"Content-Type",
			"application/problem+json",
		);
		expect(reply.send).toHaveBeenCalledWith({
			type: "about:blank",
			title: "Bad Request",
			status: 400,
			detail: "title must not be empty, dueDate must be a valid date",
			instance: "/v1/nodes",
		});
	});

	it("formats a custom domain error thrown as an HttpException subclass", () => {
		const filter = new Rfc7807ExceptionFilter();
		const reply = createReplyMock();

		filter.catch(
			new ConflictException("a tag with this name already exists"),
			createHost("/v1/tags", reply),
		);

		expect(reply.status).toHaveBeenCalledWith(409);
		expect(reply.send).toHaveBeenCalledWith({
			type: "about:blank",
			title: "Conflict",
			status: 409,
			detail: "a tag with this name already exists",
			instance: "/v1/tags",
		});
	});

	it("formats an unhandled exception as a generic 500 without leaking internals", () => {
		const filter = new Rfc7807ExceptionFilter();
		const reply = createReplyMock();

		filter.catch(
			new Error("connection terminated unexpectedly at pg pool"),
			createHost("/v1/nodes/123", reply),
		);

		expect(reply.status).toHaveBeenCalledWith(500);
		expect(reply.send).toHaveBeenCalledWith({
			type: "about:blank",
			title: "Internal Server Error",
			status: 500,
			detail: "An unexpected error occurred.",
			instance: "/v1/nodes/123",
		});
	});
});
