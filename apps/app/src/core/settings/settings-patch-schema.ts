import { type FontId, fontIds } from "@cascade/theme/fonts";
import {
	darkThemeIds,
	lightThemeIds,
	type ThemeId,
	type ThemeSelection,
	themeSelectionIds,
} from "@cascade/theme/themes";
import { z } from "zod";

export const MIN_INDENT_SIZE = 2;
export const MAX_INDENT_SIZE = 64;

/**
 * The user settings that persist across devices. Only keys the user has
 * explicitly changed are stored, so each device keeps its own defaults
 * (e.g. a theme from `prefers-color-scheme`) until the user picks a value.
 */
export interface Settings {
	/** A concrete theme, or "system" to follow the OS light/dark preference. */
	theme: ThemeSelection;
	/** Used for the light half of the OS preference when `theme` is "system". */
	lightTheme: ThemeId;
	/** Used for the dark half of the OS preference when `theme` is "system". */
	darkTheme: ThemeId;
	font: FontId;
	indentSize: number;
	preAlphaBannerDismissed: boolean;
}

/** A partial settings object: unknown keys are stripped, values validated. */
export const settingsPatchSchema = z
	.object({
		theme: z.enum(themeSelectionIds),
		lightTheme: z.enum(lightThemeIds),
		darkTheme: z.enum(darkThemeIds),
		font: z.enum(fontIds),
		indentSize: z.number().int().min(MIN_INDENT_SIZE).max(MAX_INDENT_SIZE),
		preAlphaBannerDismissed: z.boolean(),
	})
	.partial();

export type SettingsPatch = z.infer<typeof settingsPatchSchema>;
