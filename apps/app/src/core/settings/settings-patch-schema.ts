import { z } from "zod";

export const MIN_INDENT_SIZE = 2;
export const MAX_INDENT_SIZE = 64;

/**
 * The user settings that persist across devices. Only keys the user has
 * explicitly changed are stored, so each device keeps its own defaults
 * (e.g. dark mode from `prefers-color-scheme`) until the user picks a value.
 */
export interface Settings {
	dark: boolean;
	indentSize: number;
	preAlphaBannerDismissed: boolean;
}

/** A partial settings object: unknown keys are stripped, values validated. */
export const settingsPatchSchema = z
	.object({
		dark: z.boolean(),
		indentSize: z.number().int().min(MIN_INDENT_SIZE).max(MAX_INDENT_SIZE),
		preAlphaBannerDismissed: z.boolean(),
	})
	.partial();

export type SettingsPatch = z.infer<typeof settingsPatchSchema>;
