const isProd = process.env.NODE_ENV === "production";

function contentSecurityPolicy(nonce: string): string {
	return [
		"default-src 'self'",
		`script-src 'self' 'nonce-${nonce}' 'unsafe-eval' https://rybbit.patrickroelofs.com`,
		"style-src 'self' 'unsafe-inline'",
		"img-src 'self' data: https:",
		"font-src 'self' data:",
		"connect-src 'self' https://rybbit.patrickroelofs.com",
		"object-src 'none'",
		"base-uri 'self'",
		"form-action 'self'",
		"frame-ancestors 'none'",
	].join("; ");
}

function securityHeaders(nonce: string): Record<string, string> {
	return {
		"X-Content-Type-Options": "nosniff",
		"X-Frame-Options": "DENY",
		"Referrer-Policy": "strict-origin-when-cross-origin",
		"Content-Security-Policy": contentSecurityPolicy(nonce),
		...(isProd
			? { "Strict-Transport-Security": "max-age=63072000; includeSubDomains" }
			: {}),
	};
}

export function applySecurityHeaders(
	response: Response,
	nonce: string,
): Response {
	for (const [key, value] of Object.entries(securityHeaders(nonce))) {
		response.headers.set(key, value);
	}
	return response;
}

const nonceByRequest = new WeakMap<Request, string>();

export function issueCspNonce(request: Request): string {
	const bytes = crypto.getRandomValues(new Uint8Array(16));
	const nonce = btoa(String.fromCharCode(...bytes));
	nonceByRequest.set(request, nonce);
	return nonce;
}

export function getCspNonce(request: Request): string | undefined {
	return nonceByRequest.get(request);
}
