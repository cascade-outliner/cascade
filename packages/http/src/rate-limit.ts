export interface RateLimiterOptions {
	/** Length of the fixed window, in milliseconds. */
	windowMs: number;
	/** Max requests allowed per key within a window. */
	max: number;
}

interface Bucket {
	count: number;
	resetAt: number;
}

// Fixed-window counter kept in memory (mirrors Better Auth's own default
// rate limiter). Only correct for a single Node process; a horizontally
// scaled deployment would need a shared store instead.
export function createRateLimiter({ windowMs, max }: RateLimiterOptions) {
	const hits = new Map<string, Bucket>();

	return function isRateLimited(key: string): boolean {
		const now = Date.now();

		if (hits.size > 50_000) {
			for (const [k, bucket] of hits) {
				if (bucket.resetAt <= now) hits.delete(k);
			}
		}

		const bucket = hits.get(key);
		if (!bucket || bucket.resetAt <= now) {
			hits.set(key, { count: 1, resetAt: now + windowMs });
			return false;
		}

		bucket.count += 1;
		return bucket.count > max;
	};
}

export function getClientIp(request: Request): string {
	const forwardedFor = request.headers.get("x-forwarded-for");
	const first = forwardedFor?.split(",")[0]?.trim();
	return first || request.headers.get("x-real-ip") || "unknown";
}
