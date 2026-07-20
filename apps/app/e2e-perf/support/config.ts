function optional(name: string, fallback: string): string {
	const value = process.env[name];
	return value && value.length > 0 ? value : fallback;
}

/** Central place for perf-script config so scripts never read `process.env` directly. */
export const config = {
	appUrl: optional("APP_URL", "http://localhost:3001"),
	perfUserEmail: optional("PERF_USER_EMAIL", "perf-harness@cascadelist.com"),
	perfUserPassword: optional("PERF_USER_PASSWORD", "perf-harness-password-1234"),
	perfUserName: "Perf Harness User",
};
