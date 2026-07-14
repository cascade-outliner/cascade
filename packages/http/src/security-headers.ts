const isProd = process.env.NODE_ENV === "production";

const contentSecurityPolicy = [
	"default-src 'self'",
	"script-src 'self' 'unsafe-inline' https://rybbit.patrickroelofs.com",
	"style-src 'self' 'unsafe-inline'",
	"img-src 'self' data: https:",
	"font-src 'self' data:",
	"connect-src 'self' https://rybbit.patrickroelofs.com",
	"object-src 'none'",
	"base-uri 'self'",
	"form-action 'self'",
	"frame-ancestors 'none'",
].join("; ");

export const securityHeaders: Record<string, string> = {
	"X-Content-Type-Options": "nosniff",
	"X-Frame-Options": "DENY",
	"Referrer-Policy": "strict-origin-when-cross-origin",
	"Content-Security-Policy": contentSecurityPolicy,
	...(isProd
		? { "Strict-Transport-Security": "max-age=63072000; includeSubDomains" }
		: {}),
};

export function applySecurityHeaders(response: Response): Response {
	for (const [key, value] of Object.entries(securityHeaders)) {
		response.headers.set(key, value);
	}
	return response;
}
