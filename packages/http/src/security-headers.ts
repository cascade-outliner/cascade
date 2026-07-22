const isProd = process.env.NODE_ENV === "production";

function securityHeaders(): Record<string, string> {
	return {
		"X-Content-Type-Options": "nosniff",
		"X-Frame-Options": "DENY",
		"Referrer-Policy": "strict-origin-when-cross-origin",
		...(isProd
			? { "Strict-Transport-Security": "max-age=63072000; includeSubDomains" }
			: {}),
	};
}

export function applySecurityHeaders(response: Response): Response {
	for (const [key, value] of Object.entries(securityHeaders())) {
		response.headers.set(key, value);
	}
	return response;
}
