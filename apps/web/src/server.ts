import { applySecurityHeaders } from "@cascade/http/security-headers";
import handler from "@tanstack/react-start/server-entry";
import { paraglideMiddleware } from "./paraglide/server.js";

export default {
	async fetch(req: Request): Promise<Response> {
		const response = await paraglideMiddleware(req, () => handler.fetch(req));
		return applySecurityHeaders(response);
	},
};
