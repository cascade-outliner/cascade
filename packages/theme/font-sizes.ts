/**
 * The font size registry. Each non-default size maps to a
 * `[data-font-size="…"]` block in `theme.css` that overrides
 * `--font-size-scale`; the default needs no attribute. The scale multiplies
 * the root font size, so every rem-based size throughout the app (outliner,
 * editor, UI) follows it.
 */
export interface FontSize {
	/** Stable id, persisted in user settings and used as the `data-font-size` value. */
	id: string;
	/** English display name. */
	label: string;
	/** Multiplier applied to the root font size. */
	scale: number;
}

export const fontSizes = [
	{ id: "small", label: "Small", scale: 0.875 },
	{ id: "default", label: "Default", scale: 1 },
	{ id: "large", label: "Large", scale: 1.125 },
	{ id: "extra-large", label: "Extra large", scale: 1.25 },
] as const satisfies readonly FontSize[];

export type FontSizeId = (typeof fontSizes)[number]["id"];

export const fontSizeIds = fontSizes.map((size) => size.id) as [
	FontSizeId,
	...FontSizeId[],
];

/**
 * The `data-font-size` attribute value for a font size, or `undefined` for
 * the default, which uses the default `--font-size-scale` and needs no
 * attribute.
 */
export function fontSizeAttribute(id: FontSizeId): string | undefined {
	return id === "default" ? undefined : id;
}
