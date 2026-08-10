import { lexicalToPlainText } from "./lexical-content";

// Ported from apps/web-app/src/features/nodes/model/node-content.schema.ts's
// MAX_CONTENT_BYTES — used here as the same plain-text-length cap.
const MAX_CONTENT_BYTES = 256 * 1024;

const COMBINING_MARKS = /\p{M}/gu;

export function nodePlainText(content: unknown): string {
	return lexicalToPlainText(content, MAX_CONTENT_BYTES);
}

export function foldSearchText(value: string): string {
	return value.normalize("NFKD").replace(COMBINING_MARKS, "").toLowerCase();
}

export function normalizeSearchText(value: string): string {
	return foldSearchText(value).replace(/\s+/g, " ").trim();
}
