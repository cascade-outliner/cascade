import { z } from "zod";

export const emailSchema = z.email();

// Mirrors better-auth's own minimum (see PASSWORD_TOO_SHORT in
// packages/auth) so the client can reject a too-short password before
// making a round trip.
export const passwordSchema = z.string().min(8).max(128);

export const loginSchema = z.object({
	email: emailSchema,
	password: z.string().min(1),
});

export const registerSchema = z.object({
	name: z.string().trim().min(1).max(128),
	email: emailSchema,
	password: passwordSchema,
});

export type LoginValues = z.infer<typeof loginSchema>;
export type RegisterValues = z.infer<typeof registerSchema>;
