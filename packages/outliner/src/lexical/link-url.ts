export const MAX_URL_LENGTH = 2048;
export const TIDY_LABEL_MAX_LENGTH = 40;

/**
 * Only http(s) URLs are ever turned into links on paste or rendered with an
 * href, so a stored `javascript:`/`data:` URL can never become clickable.
 */
export function isHttpUrl(value: string): boolean {
	if (!/^https?:\/\//i.test(value)) return false;
	if (value.length > MAX_URL_LENGTH) return false;
	try {
		new URL(value);
		return true;
	} catch {
		return false;
	}
}

/**
 * Normalizes free-form popover input to an http(s) URL, prepending `https://`
 * when no scheme was typed (`example.com/a` → `https://example.com/a`).
 * Returns null when the input can't be an http(s) URL at all.
 */
export function normalizeHttpUrl(input: string): string | null {
	const trimmed = input.trim();
	if (trimmed === "" || /\s/.test(trimmed)) return null;
	const candidate = /^[a-z][a-z0-9+.-]*:/i.test(trimmed)
		? trimmed
		: `https://${trimmed}`;
	return isHttpUrl(candidate) ? candidate : null;
}

/**
 * Human-friendly display text for a URL: hostname without `www.` plus the
 * path/query/hash, truncated with an ellipsis. Used as the initial link text
 * when a pasted URL is converted into a link.
 */
export function tidyUrlLabel(
	url: string,
	maxLength = TIDY_LABEL_MAX_LENGTH,
): string {
	let parsed: URL;
	try {
		parsed = new URL(url);
	} catch {
		return url.length <= maxLength ? url : `${url.slice(0, maxLength - 1)}…`;
	}
	const host = parsed.hostname.replace(/^www\./, "");
	const rest = `${parsed.pathname}${parsed.search}${parsed.hash}`;
	const label = rest === "/" ? host : `${host}${rest}`;
	if (label.length <= maxLength) return label;
	return `${label.slice(0, maxLength - 1)}…`;
}
