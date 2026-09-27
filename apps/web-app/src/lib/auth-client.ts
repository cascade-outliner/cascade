import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient();

export function signInWithGoogle(): Promise<unknown> {
	return authClient.signIn.social({
		provider: "google",
		callbackURL: window.location.pathname,
	});
}

/** Ends the session and reloads so the outline restarts without sync. */
export async function signOut(): Promise<void> {
	await authClient.signOut();
	window.location.reload();
}
