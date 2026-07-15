import { applySecurityHeaders } from "@cascade/http/security-headers";
import {
	createStartHandler,
	defaultStreamHandler,
} from "@tanstack/react-start/server";
import { FastResponse } from "srvx";
import { paraglideMiddleware } from "./paraglide/server.js";

globalThis.Response = FastResponse;

const startHandler = createStartHandler(defaultStreamHandler);

export default {
	async fetch(request: Request): Promise<Response> {
		const response = await paraglideMiddleware(request, () =>
			startHandler(request),
		);
		return applySecurityHeaders(response);
	},
};
