const SUPPORTED_LINK_PROTOCOLS = new Set(["http:", "https:"]);

const MAX_LINK_LABEL_LENGTH = 60;

/**
 * Returns the URL when pasted text is nothing but a single absolute http(s)
 * URL, so a multi-word paste containing a URL falls through to plain-text
 * paste instead of being auto-linked.
 */
export function extractPastedUrl(text: string): string | null {
	const trimmed = text.trim();
	if (!trimmed || /\s/.test(trimmed)) return null;

	let url: URL;
	try {
		url = new URL(trimmed);
	} catch {
		return null;
	}
	if (!SUPPORTED_LINK_PROTOCOLS.has(url.protocol)) return null;
	return trimmed;
}

/**
 * Trims a URL down to a human-friendly label (hostname plus a short path)
 * so long pasted links don't dominate node content while the full URL stays
 * available via the link's href/title.
 */
export function tidyLinkLabel(
	url: string,
	maxLength = MAX_LINK_LABEL_LENGTH,
): string {
	let label: string;
	try {
		const parsed = new URL(url);
		const host = parsed.hostname.replace(/^www\./, "");
		const rest = `${parsed.pathname}${parsed.search}${parsed.hash}`;
		label = rest && rest !== "/" ? `${host}${rest}` : host;
	} catch {
		label = url;
	}
	return label.length > maxLength ? `${label.slice(0, maxLength - 1)}…` : label;
}
