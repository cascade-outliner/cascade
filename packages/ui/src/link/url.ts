import { createLinkMatcherWithRegExp, type LinkMatcher } from "@lexical/link";

const SAFE_PROTOCOLS = new Set(["http:", "https:", "mailto:"]);

const URL_REGEX =
	/(?:https?:\/\/(?:www\.)?|www\.)[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_+.~#?&/=]*[-a-zA-Z0-9()@%_+~#&/=])?/;

const SCHEME_REGEX = /^[a-z][a-z0-9+.-]*:/i;

export const LINK_ATTRIBUTES = { rel: "noopener noreferrer" };

export function isSafeUrl(url: string): boolean {
	try {
		return SAFE_PROTOCOLS.has(new URL(url).protocol);
	} catch {
		return false;
	}
}

export function normalizeUrl(input: string): string | null {
	const trimmed = input.trim();
	if (!trimmed || /\s/.test(trimmed)) return null;
	const url = SCHEME_REGEX.test(trimmed) ? trimmed : `https://${trimmed}`;
	return isSafeUrl(url) ? url : null;
}

export function openUrl(url: string) {
	if (!isSafeUrl(url)) return;
	window.open(url, "_blank", "noopener,noreferrer");
}

const urlMatcher = createLinkMatcherWithRegExp(URL_REGEX, (text) =>
	SCHEME_REGEX.test(text) ? text : `https://${text}`,
);

export const LINK_MATCHERS: LinkMatcher[] = [
	(text) => {
		const match = urlMatcher(text);
		return match && { ...match, attributes: LINK_ATTRIBUTES };
	},
];

export function linkAttributes(url: string, text: string) {
	if (!text || text === url) return LINK_ATTRIBUTES;
	try {
		const { protocol, hostname, pathname } = new URL(url);
		const label =
			protocol === "mailto:" ? pathname : hostname.replace(/^www\./, "");
		return label ? { ...LINK_ATTRIBUTES, title: label } : LINK_ATTRIBUTES;
	} catch {
		return LINK_ATTRIBUTES;
	}
}
