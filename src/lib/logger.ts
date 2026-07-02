type Level = "debug" | "info" | "warn" | "error";

const isProd = process.env.NODE_ENV === "production";

function log(level: Level, message: string, meta?: Record<string, unknown>) {
	if (isProd) {
		// JSON lines for log aggregation
		console[level === "debug" ? "log" : level](
			JSON.stringify({
				level,
				message,
				time: new Date().toISOString(),
				...meta,
			}),
		);
	} else {
		console[level === "debug" ? "log" : level](
			`[${level}] ${message}`,
			meta ?? "",
		);
	}
}

export const logger = {
	debug: (message: string, meta?: Record<string, unknown>) =>
		log("debug", message, meta),
	info: (message: string, meta?: Record<string, unknown>) =>
		log("info", message, meta),
	warn: (message: string, meta?: Record<string, unknown>) =>
		log("warn", message, meta),
	error: (message: string, meta?: Record<string, unknown>) =>
		log("error", message, meta),
};
