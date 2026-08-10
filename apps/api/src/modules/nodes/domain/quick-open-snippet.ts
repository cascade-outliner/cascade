import { foldSearchText, nodePlainText } from "./node-search-text";

const SNIPPET_LENGTH = 180;

export interface QuickOpenSnippet {
	text: string;
	highlightRanges: Array<{ start: number; end: number }>;
	hasPrefix: boolean;
	hasSuffix: boolean;
}

function foldedTextWithOffsets(value: string) {
	let folded = "";
	const offsets: Array<{ start: number; end: number }> = [];

	for (let start = 0; start < value.length; ) {
		const codePoint = value.codePointAt(start);
		if (codePoint === undefined) break;
		const character = String.fromCodePoint(codePoint);
		const end = start + character.length;
		const normalized = foldSearchText(character);
		folded += normalized;
		for (let index = 0; index < normalized.length; index++) {
			offsets.push({ start, end });
		}
		start = end;
	}

	return { folded, offsets };
}

/** Ported from apps/web-app/src/features/nodes/model/quick-open.ts. */
export function quickOpenSnippet(
	content: unknown,
	normalizedQuery: string,
): QuickOpenSnippet {
	const plainText = nodePlainText(content);
	const { folded, offsets } = foldedTextWithOffsets(plainText);
	const firstMatch = folded.indexOf(normalizedQuery);
	const firstStart = firstMatch < 0 ? 0 : (offsets[firstMatch]?.start ?? 0);
	const firstEnd =
		firstMatch < 0
			? 0
			: (offsets[firstMatch + normalizedQuery.length - 1]?.end ?? firstStart);
	const matchLength = firstEnd - firstStart;
	const surrounding = Math.max(0, SNIPPET_LENGTH - matchLength);
	const start = Math.max(0, firstStart - Math.floor(surrounding / 2));
	const end = Math.min(plainText.length, start + SNIPPET_LENGTH);
	const snippetStart = Math.max(0, end - SNIPPET_LENGTH);
	const highlightRanges: QuickOpenSnippet["highlightRanges"] = [];

	let matchIndex = folded.indexOf(normalizedQuery);
	while (matchIndex >= 0) {
		const matchStart = offsets[matchIndex]?.start;
		const matchEnd = offsets[matchIndex + normalizedQuery.length - 1]?.end;
		if (
			matchStart !== undefined &&
			matchEnd !== undefined &&
			matchStart < end &&
			matchEnd > snippetStart
		) {
			highlightRanges.push({
				start: Math.max(matchStart, snippetStart) - snippetStart,
				end: Math.min(matchEnd, end) - snippetStart,
			});
		}
		matchIndex = folded.indexOf(
			normalizedQuery,
			matchIndex + normalizedQuery.length,
		);
	}

	return {
		text: plainText.slice(snippetStart, end),
		highlightRanges,
		hasPrefix: snippetStart > 0,
		hasSuffix: end < plainText.length,
	};
}
