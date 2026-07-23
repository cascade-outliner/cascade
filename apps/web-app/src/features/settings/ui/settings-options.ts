import { type FontSizeId, fontSizes } from "@cascade/theme/font-sizes";
import { type FontId, fonts } from "@cascade/theme/fonts";
import { SYSTEM_THEME, themes } from "@cascade/theme/themes";
import { m } from "#/paraglide/messages.js";

function themeLabel(theme: (typeof themes)[number]): string {
	if (theme.id === "light") return m.user_menu_theme_light();
	if (theme.id === "dark") return m.user_menu_theme_dark();
	return theme.label;
}

function themeOption(theme: (typeof themes)[number], isPremium: boolean) {
	const locked = theme.premium && !isPremium;
	return {
		value: theme.id,
		label: locked
			? m.user_menu_theme_premium_option({ label: themeLabel(theme) })
			: themeLabel(theme),
		disabled: locked,
	};
}

export function themeOptions(isPremium: boolean) {
	return [
		{ value: SYSTEM_THEME, label: m.user_menu_theme_sync_system() },
		...themes.map((theme) => themeOption(theme, isPremium)),
	];
}

export function lightThemeOptions(isPremium: boolean) {
	return themes
		.filter((theme) => !theme.dark)
		.map((theme) => themeOption(theme, isPremium));
}

export function darkThemeOptions(isPremium: boolean) {
	return themes
		.filter((theme) => theme.dark)
		.map((theme) => themeOption(theme, isPremium));
}

export function fontOptions() {
	const labels: Partial<Record<FontId, string>> = {
		"system-sans": m.user_menu_font_system_sans(),
		"system-serif": m.user_menu_font_system_serif(),
		"system-mono": m.user_menu_font_monospace(),
	};
	return fonts.map((font) => ({
		value: font.id,
		label: labels[font.id] ?? font.label,
	}));
}

export function fontSizeOptions() {
	const labels: Record<FontSizeId, string> = {
		small: m.user_menu_font_size_small(),
		default: m.user_menu_font_size_default(),
		large: m.user_menu_font_size_large(),
		"extra-large": m.user_menu_font_size_extra_large(),
	};
	return fontSizes.map((fontSize) => ({
		value: fontSize.id,
		label: labels[fontSize.id],
	}));
}
