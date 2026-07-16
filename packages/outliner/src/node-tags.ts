/** A tag with how many nodes it's on, as listed by the API. */
export interface TagSummary {
	name: string;
	count: number;
}

/** Trims, drops empties, and dedupes case-insensitively (keeping first-seen casing). */
export function normalizeTags(tags: string[]): string[] {
	const seen = new Set<string>();
	const result: string[] = [];
	for (const tag of tags) {
		const trimmed = tag.trim();
		if (!trimmed) continue;
		const key = trimmed.toLowerCase();
		if (seen.has(key)) continue;
		seen.add(key);
		result.push(trimmed);
	}
	return result;
}
