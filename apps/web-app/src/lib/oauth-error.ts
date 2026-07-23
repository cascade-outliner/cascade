import { m } from "#/paraglide/messages.js";

export function oauthErrorMessage(code: string | undefined): string | null {
	if (!code) return null;
	const messages: Record<string, string> = {
		account_not_linked: m.oauth_account_not_linked(),
	};
	return messages[code] ?? m.oauth_generic_error();
}
