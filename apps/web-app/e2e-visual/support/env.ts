function optional(name: string, fallback: string): string {
	const value = process.env[name];
	return value && value.length > 0 ? value : fallback;
}

/**
 * Central place for visual-suite config. Deliberately its own account
 * (rather than the functional e2e suite's `e2e@cascadelist.com`) so flipping
 * its theme setting between screenshots can never race the e2e suite's own
 * assumptions about that account's state.
 */
export const env = {
	appUrl: optional("APP_URL", "http://localhost:3001"),
	testUserEmail: optional(
		"VISUAL_USER_EMAIL",
		"visual-harness@cascadelist.com",
	),
	testUserPassword: optional(
		"VISUAL_USER_PASSWORD",
		"visual-harness-password-1234",
	),
	testUserName: "Visual Harness User",
};

/** Relative to the Playwright rootDir (apps/web-app); shared by the config and auth.setup.ts. */
export const authFile = "e2e-visual/.auth/state.json";
