/** A matched span of the original text, `[start, end)`. */
export type TextRange = [start: number, end: number];

export interface Match {
	/** Higher is better. Only comparable between matches from the same matcher. */
	score: number;
	/** Matched spans of the original text, sorted and non-overlapping, for highlighting. */
	ranges: TextRange[];
}

/**
 * `text` lowercased with diacritics stripped, so "Café" matches "cafe".
 * Folding can change length, so `map[i]` is the original index of folded char `i`
 * (plus a trailing entry for the end of the text).
 */
export interface Folded {
	text: string;
	map: number[];
}

const MARKS = /\p{M}/gu;
const WORD_CHAR = /[\p{L}\p{N}]/u;

export function fold(text: string): Folded {
	let folded = "";
	const map: number[] = [];
	let offset = 0;
	for (const char of text) {
		const piece = char.normalize("NFD").replace(MARKS, "").toLowerCase();
		folded += piece;
		for (let i = 0; i < piece.length; i++) {
			map.push(offset);
		}
		offset += char.length;
	}
	map.push(text.length);
	return { text: folded, map };
}

/** Maps a `[start, end)` span of `folded.text` back onto the original text. */
function unfold(folded: Folded, [start, end]: TextRange): TextRange {
	const { map } = folded;
	// A span ending inside a char that folded to several chars covers all of it.
	let after = end;
	while (after < map.length - 1 && map[after] === map[end - 1]) {
		after++;
	}
	return [map[start], map[after]];
}

function isWordStart(text: string, index: number): boolean {
	return index === 0 || !WORD_CHAR.test(text[index - 1]);
}

/** Sorts spans and merges touching or overlapping ones. */
function merge(ranges: TextRange[]): TextRange[] {
	const sorted = [...ranges].sort((a, b) => a[0] - b[0]);
	const merged: TextRange[] = [];
	for (const range of sorted) {
		const last = merged[merged.length - 1];
		if (last && range[0] <= last[1]) {
			last[1] = Math.max(last[1], range[1]);
		} else {
			merged.push([...range]);
		}
	}
	return merged;
}

/** The whitespace-separated, folded, de-duplicated terms of a query. */
export function terms(query: string): string[] {
	return [...new Set(fold(query).text.split(/\s+/).filter(Boolean))];
}

/**
 * Every term must appear in `text` as a substring. Meant for long text (node
 * content), where fuzzy subsequences would match nearly everything.
 *
 * Scores favour terms that start a word, then whole words, then earlier hits.
 * Returns `null` when a term is missing or there are no terms.
 */
export function matchTerms(queryTerms: string[], text: Folded): Match | null {
	if (queryTerms.length === 0) {
		return null;
	}
	let score = 0;
	const ranges: TextRange[] = [];
	for (const term of queryTerms) {
		let best = -1;
		for (
			let at = text.text.indexOf(term);
			at !== -1;
			at = text.text.indexOf(term, at + 1)
		) {
			if (best === -1) {
				best = at;
			}
			if (isWordStart(text.text, at)) {
				best = at;
				break;
			}
		}
		if (best === -1) {
			return null;
		}
		const end = best + term.length;
		const wordStart = isWordStart(text.text, best);
		const wordEnd = end === text.text.length || !WORD_CHAR.test(text.text[end]);
		score += 1 + (wordStart ? 2 : 0) + (wordStart && wordEnd ? 1 : 0);
		// Tie-breaker only: never outweighs a word-start bonus.
		score -= Math.min(best, 999) / 1000;
		ranges.push(unfold(text, [best, end]));
	}
	return { score, ranges: merge(ranges) };
}
