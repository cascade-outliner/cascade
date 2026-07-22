import { user } from "@cascade/auth/schema";
import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const premiumSeats = pgTable("premium_seats", {
	userId: text("user_id")
		.primaryKey()
		.references(() => user.id, { onDelete: "cascade" }),
	grantedAt: timestamp("granted_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});
