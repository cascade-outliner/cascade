import {
	applySecurityHeaders,
	getCspNonce,
	issueCspNonce,
} from "@cascade/http/security-headers";
import {
	createStartHandler,
	defaultStreamHandler,
} from "@tanstack/react-start/server";
import { FastResponse } from "srvx";
import { paraglideMiddleware } from "./paraglide/server.js";

globalThis.Response = FastResponse;

const startHandler = createStartHandler((ctx) => {
	const nonce = getCspNonce(ctx.request);
	if (nonce) {
		ctx.router.options.ssr = { ...ctx.router.options.ssr, nonce };
	}
	return defaultStreamHandler(ctx);
});

export default {
	async fetch(request: Request): Promise<Response> {
		const nonce = issueCspNonce(request);
		const response = await paraglideMiddleware(request, () =>
			startHandler(request),
		);
		return applySecurityHeaders(response, nonce);
	},
};
