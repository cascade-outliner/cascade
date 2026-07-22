import { applySecurityHeaders } from "@cascade/http/security-headers";
import {
	createStartHandler,
	defaultStreamHandler,
} from "@tanstack/react-start/server";
import { paraglideMiddleware } from "./paraglide/server.js";

const startHandler = createStartHandler((ctx) => {
	return defaultStreamHandler(ctx);
});

export default {
	async fetch(req: Request): Promise<Response> {
		const response = await paraglideMiddleware(req, () => startHandler(req));
		return applySecurityHeaders(response);
	},
};
