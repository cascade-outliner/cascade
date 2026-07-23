import {
	applySecurityHeaders,
	getCspNonce,
	issueCspNonce,
} from "@cascade/http/security-headers";
import {
	createStartHandler,
	defaultStreamHandler,
} from "@tanstack/react-start/server";
import { paraglideMiddleware } from "./paraglide/server.js";

const startHandler = createStartHandler((ctx) => {
	const nonce = getCspNonce(ctx.request);
	if (nonce) {
		ctx.router.options.ssr = { ...ctx.router.options.ssr, nonce };
	}
	return defaultStreamHandler(ctx);
});

export default {
	async fetch(req: Request): Promise<Response> {
		const nonce = issueCspNonce(req);
		const response = await paraglideMiddleware(req, () => startHandler(req));
		return applySecurityHeaders(response, nonce);
	},
};
