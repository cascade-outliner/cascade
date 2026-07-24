import { user } from "@cascade/auth/schema";
import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import type { SettingsPatch } from "../model/settings.schema";

export const userSettings = pgTable("user_settings", {
	userId: text("user_id")
		.primaryKey()
		.references(() => user.id, { onDelete: "cascade" }),
	settings: jsonb("settings").notNull().$type<SettingsPatch>().default({}),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow()
		.$onUpdate(() => new Date()),
});
