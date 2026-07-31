const emojiPattern = /\p{Extended_Pictographic}/u;

/**
 * True if `value` is exactly one extended grapheme cluster containing an
 * emoji glyph — the shape a node's `icon` field is allowed to hold (see
 * issue #557). Rejects plain letters/digits and multi-character strings.
 */
export function isSingleEmoji(value: string): boolean {
	const trimmed = value.trim();
	if (!trimmed) return false;
	const segments = [
		...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(
			trimmed,
		),
	];
	return segments.length === 1 && emojiPattern.test(trimmed);
}
