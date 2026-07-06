/**
 * Curated color swatches offered in tag-creation UI. Purely a suggestion list —
 * `tags.color` is a validated hex string, not a DB enum, so new swatches are a
 * one-line addition here with no migration.
 */
export const tagPalette = [
	{ label: "Gray", value: "#6b7280" },
	{ label: "Red", value: "#ef4444" },
	{ label: "Orange", value: "#f97316" },
	{ label: "Amber", value: "#f59e0b" },
	{ label: "Green", value: "#22c55e" },
	{ label: "Teal", value: "#14b8a6" },
	{ label: "Blue", value: "#3b82f6" },
	{ label: "Indigo", value: "#6366f1" },
	{ label: "Purple", value: "#a855f7" },
	{ label: "Pink", value: "#ec4899" },
] as const satisfies { label: string; value: string }[];

export const defaultTagColor = tagPalette[0].value;
