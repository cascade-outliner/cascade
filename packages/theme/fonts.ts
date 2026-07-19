/**
 * The font registry. Each font maps to a `[data-font="…"]` block in
 * `theme.css` that overrides `--font-app`; the default (Bitter) needs no
 * attribute. All stacks end in a generic family for graceful degradation.
 */
export interface Font {
	/** Stable id, persisted in user settings and used as the `data-font` value. */
	id: string;
	/** English display name. */
	label: string;
}

export const fonts = [
	{ id: "bitter", label: "Bitter" },
	{ id: "system-sans", label: "System sans-serif" },
	{ id: "system-serif", label: "System serif" },
	{ id: "system-mono", label: "Monospace" },
] as const satisfies readonly Font[];

export type FontId = (typeof fonts)[number]["id"];

export const fontIds = fonts.map((font) => font.id) as [FontId, ...FontId[]];

/**
 * The `data-font` attribute value for a font, or `undefined` for the default
 * app font (Bitter), which uses the default `--font-app` and needs no
 * attribute.
 */
export function fontAttribute(id: FontId): string | undefined {
	return id === "bitter" ? undefined : id;
}
