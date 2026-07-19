/**
 * The theme registry. Every theme fills the same six palette slots defined in
 * `theme.css` (the `--color-*` variables), so adding a theme means adding one
 * entry here plus one `[data-theme="…"]` block there — no component changes.
 */
export interface Theme {
	/** Stable id, persisted in user settings and used as the `data-theme` value. */
	id: string;
	/** English display name. Proper-noun theme names are not translated. */
	label: string;
	/** Whether the `.dark` class (and thus `dark:` variants) applies. */
	dark: boolean;
}

export const themes = [
	{ id: "light", label: "Cascade Light", dark: false },
	{ id: "dark", label: "Cascade Dark", dark: true },
	{ id: "catppuccin-latte", label: "Catppuccin Latte", dark: false },
	{ id: "catppuccin-frappe", label: "Catppuccin Frappé", dark: true },
	{ id: "catppuccin-macchiato", label: "Catppuccin Macchiato", dark: true },
	{ id: "catppuccin-mocha", label: "Catppuccin Mocha", dark: true },
	{ id: "nord", label: "Nord", dark: true },
	{ id: "dracula", label: "Dracula", dark: true },
] as const satisfies readonly Theme[];

export type ThemeId = (typeof themes)[number]["id"];

export const themeIds = themes.map((theme) => theme.id) as [
	ThemeId,
	...ThemeId[],
];

export function isDarkTheme(id: ThemeId): boolean {
	return themes.some((theme) => theme.id === id && theme.dark);
}

/**
 * The `data-theme` attribute value for a theme, or `undefined` for the
 * built-in Cascade palettes ("light"/"dark"), which use the default variables
 * and need no attribute.
 */
export function themeAttribute(id: ThemeId): string | undefined {
	return id === "light" || id === "dark" ? undefined : id;
}
