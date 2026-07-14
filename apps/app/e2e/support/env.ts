function optional(name: string, fallback: string): string {
	const value = process.env[name];
	return value && value.length > 0 ? value : fallback;
}

/** Central place for e2e config so tests never read `process.env` directly. */
export const env = {
	appUrl: optional("APP_URL", "http://localhost:3001"),
	testUserEmail: optional("E2E_USER_EMAIL", "e2e@cascadelist.com"),
	testUserPassword: optional("E2E_USER_PASSWORD", "e2e-test-password-1234"),
	testUserName: "E2E Test User",
};

/** Relative to the Playwright rootDir (apps/app); shared by the config and auth.setup.ts. */
export const authFile = "e2e/.auth/state.json";
