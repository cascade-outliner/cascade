import { STATUS_CODES } from "node:http";
import {
	type ArgumentsHost,
	Catch,
	type ExceptionFilter,
	HttpException,
	HttpStatus,
} from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";

export interface ProblemDetails {
	type: string;
	title: string;
	status: number;
	detail: string;
	instance: string;
}

/**
 * Formats every thrown error as RFC 7807 application/problem+json instead of
 * Nest's default { statusCode, message, error } shape. Registered globally
 * in main.ts via app.useGlobalFilters(...).
 */
@Catch()
export class Rfc7807ExceptionFilter implements ExceptionFilter {
	catch(exception: unknown, host: ArgumentsHost): void {
		const ctx = host.switchToHttp();
		const response = ctx.getResponse<FastifyReply>();
		const request = ctx.getRequest<FastifyRequest>();

		const problem = toProblemDetails(exception, request.url);
		response
			.status(problem.status)
			.header("Content-Type", "application/problem+json")
			.send(problem);
	}
}

function toProblemDetails(
	exception: unknown,
	instance: string,
): ProblemDetails {
	if (exception instanceof HttpException) {
		const status = exception.getStatus();
		return {
			type: "about:blank",
			title: STATUS_CODES[status] ?? "Error",
			status,
			detail: extractDetail(exception),
			instance,
		};
	}

	// Unhandled exceptions: don't leak internals (stack traces, driver
	// errors, etc.) into the response body.
	return {
		type: "about:blank",
		title:
			STATUS_CODES[HttpStatus.INTERNAL_SERVER_ERROR] ?? "Internal Server Error",
		status: HttpStatus.INTERNAL_SERVER_ERROR,
		detail: "An unexpected error occurred.",
		instance,
	};
}

function extractDetail(exception: HttpException): string {
	const body = exception.getResponse();
	if (typeof body === "string") {
		return body;
	}
	if (typeof body === "object" && body !== null && "message" in body) {
		const { message } = body as { message?: string | string[] };
		if (Array.isArray(message)) {
			return message.join(", ");
		}
		if (typeof message === "string") {
			return message;
		}
	}
	return exception.message;
}
