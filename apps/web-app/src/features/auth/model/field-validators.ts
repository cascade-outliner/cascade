import { m } from "#/paraglide/messages.js";
import { emailSchema, passwordSchema } from "./auth-schemas";

export function validateEmail(value: string): string | undefined {
	if (!value.trim()) return m.auth_field_error_email_required();
	if (!emailSchema.safeParse(value).success)
		return m.auth_field_error_email_invalid();
	return undefined;
}

export function validateRequiredPassword(value: string): string | undefined {
	if (!value) return m.auth_field_error_password_required();
	return undefined;
}

export function validateNewPassword(value: string): string | undefined {
	if (!value) return m.auth_field_error_password_required();
	if (!passwordSchema.safeParse(value).success)
		return m.auth_field_error_password_too_short();
	return undefined;
}

export function validateName(value: string): string | undefined {
	if (!value.trim()) return m.auth_field_error_name_required();
	return undefined;
}
