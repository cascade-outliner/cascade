import { eq, sql } from "drizzle-orm";
import { userSettings } from "@/core/settings/settings.schema";
import {
	type SettingsPatch,
	settingsPatchSchema,
} from "@/core/settings/settings-patch-schema";
import { db } from "@/db";
import { authed } from "@/orpc/context";

/** The stored settings patch for the current user ({} when never saved). */
export const getSettings = authed.handler(
	async ({ context }): Promise<SettingsPatch> => {
		const [row] = await db
			.select({ settings: userSettings.settings })
			.from(userSettings)
			.where(eq(userSettings.userId, context.user.id))
			.limit(1);
		return row?.settings ?? {};
	},
);

/**
 * Merges the given keys into the user's stored settings, leaving keys not in
 * the patch untouched so concurrent updates from different devices don't
 * clobber each other's unrelated settings.
 */
export const updateSettings = authed
	.input(settingsPatchSchema)
	.handler(async ({ input, context }): Promise<SettingsPatch> => {
		const [row] = await db
			.insert(userSettings)
			.values({ userId: context.user.id, settings: input })
			.onConflictDoUpdate({
				target: userSettings.userId,
				set: {
					settings: sql`${userSettings.settings} || ${JSON.stringify(input)}::jsonb`,
					updatedAt: new Date(),
				},
			})
			.returning({ settings: userSettings.settings });
		return row.settings;
	});
