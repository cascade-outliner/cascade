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
	/** Whether picking this theme requires a premium seat. The two built-in
	 * Cascade palettes are free; every other theme is premium-only. */
	premium: boolean;
}

export const themes = [
	{ id: "light", label: "Cascade Light", dark: false, premium: false },
	{ id: "dark", label: "Cascade Dark", dark: true, premium: false },
	{
		id: "catppuccin-latte",
		label: "Catppuccin Latte",
		dark: false,
		premium: true,
	},
	{
		id: "catppuccin-frappe",
		label: "Catppuccin Frappé",
		dark: true,
		premium: true,
	},
	{
		id: "catppuccin-macchiato",
		label: "Catppuccin Macchiato",
		dark: true,
		premium: true,
	},
	{
		id: "catppuccin-mocha",
		label: "Catppuccin Mocha",
		dark: true,
		premium: true,
	},
	{ id: "nord", label: "Nord", dark: true, premium: true },
	{ id: "dracula", label: "Dracula", dark: true, premium: true },
] as const satisfies readonly Theme[];

export type ThemeId = (typeof themes)[number]["id"];

export const themeIds = themes.map((theme) => theme.id) as [
	ThemeId,
	...ThemeId[],
];

/** Sentinel selection meaning "follow the OS light/dark preference". */
export const SYSTEM_THEME = "system" as const;

/** What's actually stored for the theme setting: a concrete theme, or sync-with-system. */
export type ThemeSelection = ThemeId | typeof SYSTEM_THEME;

export const themeSelectionIds = [...themeIds, SYSTEM_THEME] as [
	ThemeSelection,
	...ThemeSelection[],
];

function themeIdsWhere(dark: boolean) {
	return themes
		.filter((theme) => theme.dark === dark)
		.map((theme) => theme.id) as [ThemeId, ...ThemeId[]];
}

/** Themes offered as the "light theme" half of a system-sync selection. */
export const lightThemeIds = themeIdsWhere(false);
/** Themes offered as the "dark theme" half of a system-sync selection. */
export const darkThemeIds = themeIdsWhere(true);

export function isDarkTheme(id: ThemeId): boolean {
	return themes.some((theme) => theme.id === id && theme.dark);
}

export function isPremiumTheme(id: ThemeId): boolean {
	return themes.some((theme) => theme.id === id && theme.premium);
}

/**
 * The `data-theme` attribute value for a theme, or `undefined` for the
 * built-in Cascade palettes ("light"/"dark"), which use the default variables
 * and need no attribute.
 */
export function themeAttribute(id: ThemeId): string | undefined {
	return id === "light" || id === "dark" ? undefined : id;
}

/**
 * Resolves a stored theme selection to a concrete theme id: a fixed selection
 * passes through unchanged; "system" picks the user's configured light or
 * dark theme based on the current OS preference.
 */
export function resolveThemeId(
	selection: ThemeSelection,
	lightTheme: ThemeId,
	darkTheme: ThemeId,
	systemPrefersDark: boolean,
): ThemeId {
	if (selection !== SYSTEM_THEME) return selection;
	return systemPrefersDark ? darkTheme : lightTheme;
}
