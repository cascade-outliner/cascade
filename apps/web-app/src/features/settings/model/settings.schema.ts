import { type FontSizeId, fontSizeIds } from "@cascade/theme/font-sizes";
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

/** Keys identifying specific nodes in the seeded onboarding sample outline,
 * so the tour (see `packages/onboarding`) can spotlight the real node it's
 * talking about instead of only its own text. Set once by the sign-up hook;
 * absent (or missing individual keys) once the tour is done, or for
 * accounts that predate this feature — the tour skips steps it can't
 * anchor. */
export const onboardingSampleNodeKeys = [
	"createNode",
	"indentNode",
	"focusDot",
	"task",
	"tagged",
] as const;

export type OnboardingSampleNodeKey = (typeof onboardingSampleNodeKeys)[number];

export type OnboardingSampleNodeIds = Partial<
	Record<OnboardingSampleNodeKey, string>
>;

const onboardingSampleNodeIdsSchema = z
	.object(
		Object.fromEntries(
			onboardingSampleNodeKeys.map((key) => [key, z.string()]),
		) as Record<OnboardingSampleNodeKey, z.ZodString>,
	)
	.partial();

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
	fontSize: FontSizeId;
	indentSize: number;
	hideCompletedByDefault: boolean;
	preAlphaBannerDismissed: boolean;
	/** Whether the first-run onboarding tour has been dismissed or completed. */
	onboardingCompleted: boolean;
	/** Node ids the onboarding tour anchors its steps to; see `onboardingSampleNodeKeys`. */
	onboardingSampleNodeIds: OnboardingSampleNodeIds;
}

/** A partial settings object: unknown keys are stripped, values validated. */
export const settingsPatchSchema = z
	.object({
		theme: z.enum(themeSelectionIds),
		lightTheme: z.enum(lightThemeIds),
		darkTheme: z.enum(darkThemeIds),
		font: z.enum(fontIds),
		fontSize: z.enum(fontSizeIds),
		indentSize: z.number().int().min(MIN_INDENT_SIZE).max(MAX_INDENT_SIZE),
		hideCompletedByDefault: z.boolean(),
		preAlphaBannerDismissed: z.boolean(),
		onboardingCompleted: z.boolean(),
		onboardingSampleNodeIds: onboardingSampleNodeIdsSchema,
	})
	.partial();

export type SettingsPatch = z.infer<typeof settingsPatchSchema>;
