import { m } from "#/paraglide/messages.js";

// Codes from better-auth's BASE_ERROR_CODES (@better-auth/core/error) that
// login/register can realistically hit. Anything else falls back to the
// server's own message, then a generic fallback.
const knownCodes: Record<string, () => string> = {
	INVALID_EMAIL_OR_PASSWORD: () => m.auth_error_invalid_credentials(),
	INVALID_EMAIL: () => m.auth_error_invalid_email(),
	INVALID_PASSWORD: () => m.auth_error_invalid_password(),
	USER_NOT_FOUND: () => m.auth_error_invalid_credentials(),
	USER_ALREADY_EXISTS: () => m.auth_error_email_in_use(),
	USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: () => m.auth_error_email_in_use(),
	PASSWORD_TOO_SHORT: () => m.auth_error_password_too_short(),
	PASSWORD_TOO_LONG: () => m.auth_error_password_too_long(),
	CREDENTIAL_ACCOUNT_NOT_FOUND: () =>
		m.auth_error_credential_account_not_found(),
};

export function authErrorMessage(
	error:
		| {
				code?: string | undefined;
				message?: string | undefined;
				status?: number | undefined;
		  }
		| null
		| undefined,
): string {
	if (!error) return m.auth_error_fallback();

	const byCode = error.code ? knownCodes[error.code] : undefined;
	if (byCode) return byCode();

	// A 0 status (or no status) means the request never reached the server —
	// most commonly the network being down.
	if (!error.status) return m.auth_error_network();

	return error.message ?? m.auth_error_fallback();
}
