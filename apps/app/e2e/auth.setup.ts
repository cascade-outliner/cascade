import { test as setup } from "@playwright/test";

export const AUTH_STATE = "e2e/.auth/state.json";

// Signs in as the seeded dev user (created by `pnpm db:seed`) and stores the
// session cookie for the other e2e projects. Falls back to registering the
// user against a fresh database — but the node specs expect seeded data, so
// run the seed first for the full suite.
setup("authenticate", async ({ request }) => {
	const credentials = { email: "dev@cascadelist.com", password: "password1234" };

	const signIn = await request.post("/api/auth/sign-in/email", {
		data: credentials,
	});
	if (!signIn.ok()) {
		const signUp = await request.post("/api/auth/sign-up/email", {
			data: { name: "Dev User", ...credentials },
		});
		if (!signUp.ok()) {
			throw new Error(
				`auth setup failed: sign-in ${signIn.status()}, sign-up ${signUp.status()}`,
			);
		}
	}

	await request.storageState({ path: AUTH_STATE });
});
