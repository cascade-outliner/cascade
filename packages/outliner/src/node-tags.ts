/** A tag with how many nodes it's on, as listed by the API. */
export interface TagSummary {
	name: string;
	count: number;
}

/** Longest allowed tag name (after trimming), enforced in both the tags
 * editor UI and the server's setTags input schema. */
export const MAX_TAG_LENGTH = 64;

/** Small set of hues tag pills can be tinted with; each needs a hand-tuned
 * dark-mode variant, so keep this list in sync with the `hue` cva variant in
 * features/tags/node-tags-pills.tsx. */
export const TAG_HUES = [
	"amber",
	"emerald",
	"sky",
	"violet",
	"rose",
	"teal",
] as const;

export type TagHue = (typeof TAG_HUES)[number];

/**
 * Deterministic recognition color for a tag name: the same name always maps
 * to the same hue (case-insensitive), so every "urgent" pill looks the same
 * without a schema change or a color picker. Collisions are expected once a
 * user has more tags than hues — color is a recognition aid, not an
 * identifier.
 */
export function tagHue(name: string): TagHue {
	const lower = name.toLowerCase();
	let hash = 0;
	for (let i = 0; i < lower.length; i++) {
		hash = (hash * 31 + lower.charCodeAt(i)) | 0;
	}
	return TAG_HUES[Math.abs(hash) % TAG_HUES.length];
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

/**
 * Adds one tag to a single row's tag list (case-insensitively deduped),
 * leaving the rest of the list untouched. Used for the bulk "add tag to
 * selection" action, where every selected row keeps whatever tags it
 * already had — unlike `setTags`, which replaces one node's whole list.
 */
export function addTag(tags: string[], tag: string): string[] {
	const trimmed = tag.trim();
	if (!trimmed) return tags;
	const lower = trimmed.toLowerCase();
	if (tags.some((t) => t.toLowerCase() === lower)) return tags;
	return [...tags, trimmed];
}

/** Removes one tag (case-insensitively) from a single row's tag list, if present. */
export function removeTag(tags: string[], tag: string): string[] {
	const lower = tag.trim().toLowerCase();
	return tags.filter((t) => t.toLowerCase() !== lower);
}
