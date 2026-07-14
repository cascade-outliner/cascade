import { lexicalToPlainText } from "@cascade/outliner/lexical-content";

const COMBINING_MARKS = /[\u0300-\u036f]/g;
const NON_ALPHANUMERIC = /[^a-z0-9]+/g;
const EDGE_HYPHENS = /^-+|-+$/g;
const DELIMITER = "-";
const LEGACY_DELIMITER = "--";
const MAX_CONTENT_SLUG_LENGTH = 64;
const UUID_REGEX =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const UUID_FIRST_BLOCK_REGEX = /^[0-9a-f]{8}$/i;

const truncateSlug = (value: string) =>
	value.slice(0, MAX_CONTENT_SLUG_LENGTH).replace(EDGE_HYPHENS, "");

const compactNodeId = (id: string) =>
	UUID_REGEX.test(id) ? (id.split("-")[0] ?? id) : id;

export const slugifyNodeContent = (content: unknown) => {
	const normalized = lexicalToPlainText(content)
		.toLowerCase()
		.normalize("NFKD")
		.replace(COMBINING_MARKS, "")
		.replace(NON_ALPHANUMERIC, "-")
		.replace(EDGE_HYPHENS, "");

	const truncated = truncateSlug(normalized);
	return truncated || "untitled";
};

export const toNodeSlug = ({ id, content }: { id: string; content: unknown }) =>
	`${slugifyNodeContent(content)}${DELIMITER}${compactNodeId(id)}`;

export const splitNodeSlug = (slug: string) => {
	const legacyDelimiterIndex = slug.lastIndexOf(LEGACY_DELIMITER);
	if (legacyDelimiterIndex >= 0) {
		const slugText = slug.slice(0, legacyDelimiterIndex) || null;
		const slugId = slug.slice(legacyDelimiterIndex + LEGACY_DELIMITER.length);
		return { slugText, slugId: slugId || slug };
	}

	const delimiterIndex = slug.lastIndexOf(DELIMITER);
	if (delimiterIndex < 0) return { slugText: null, slugId: slug };

	const slugText = slug.slice(0, delimiterIndex) || null;
	const slugId = slug.slice(delimiterIndex + DELIMITER.length);
	if (!slugId) return { slugText: null, slugId: slug };
	if (!isUuidFirstBlock(slugId) && !isUuid(slugId)) {
		return { slugText: null, slugId: slug };
	}

	return { slugText, slugId };
};

export const isUuid = (value: string) => UUID_REGEX.test(value);
export const isUuidFirstBlock = (value: string) =>
	UUID_FIRST_BLOCK_REGEX.test(value);
