import {
	createStartHandler,
	defaultStreamHandler,
} from "@tanstack/react-start/server";
import { FastResponse } from "srvx";
import { paraglideMiddleware } from "./paraglide/server.js";

globalThis.Response = FastResponse;

const startHandler = createStartHandler(defaultStreamHandler);

const securityHeaders: Record<string, string> = {
	"X-Content-Type-Options": "nosniff",
	"X-Frame-Options": "DENY",
	"Referrer-Policy": "strict-origin-when-cross-origin",
};

export default {
	async fetch(request: Request): Promise<Response> {
		const response = await paraglideMiddleware(request, () =>
			startHandler(request),
		);
		for (const [key, value] of Object.entries(securityHeaders)) {
			response.headers.set(key, value);
		}
		return response;
	},
};
