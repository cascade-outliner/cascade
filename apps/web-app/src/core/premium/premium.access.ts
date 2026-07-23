import { eq } from "drizzle-orm";
import { premiumSeats } from "@/core/premium/premium.schema";
import { db } from "@/db";
import { authed } from "@/orpc/context";

/** Whether a user currently has an active premium seat. Shared by
 * `requirePremium` and by any write path that needs to skip doing
 * premium-only work for everyone else. */
export async function isPremiumUser(userId: string): Promise<boolean> {
	const [row] = await db
		.select({ userId: premiumSeats.userId })
		.from(premiumSeats)
		.where(eq(premiumSeats.userId, userId))
		.limit(1);
	return !!row;
}

/**
 * Drop-in replacement for `authed` on procedures that should only run for
 * premium users. Throws PREMIUM_REQUIRED (402) otherwise.
 */
export const requirePremium = authed
	.errors({
		PREMIUM_REQUIRED: { status: 402, message: "Premium seat required" },
	})
	.use(async ({ context, next, errors }) => {
		if (!(await isPremiumUser(context.user.id))) {
			throw errors.PREMIUM_REQUIRED();
		}
		return next({ context });
	});
