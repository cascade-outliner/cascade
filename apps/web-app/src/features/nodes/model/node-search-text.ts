import { lexicalToPlainText } from "@cascade/outliner/lexical-content";
import { MAX_CONTENT_BYTES } from "./node-content.schema";

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

export function nodeSearchText(content: unknown): string {
	return normalizeSearchText(nodePlainText(content));
}
