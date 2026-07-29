import { randomBytes } from "node:crypto";

/** URL-safe, unguessable token identifying a share link (~32 chars from 24 random bytes). */
export function generateShareToken(): string {
	return randomBytes(24).toString("base64url");
}
