import { eq } from "drizzle-orm";
import { premiumSeats } from "@/core/premium/premium.schema";
import { db } from "@/db";
import { authed } from "@/orpc/context";

/**
 * Drop-in replacement for `authed` on procedures that should only run for
 * premium users. Throws PREMIUM_REQUIRED (402) otherwise.
 */
export const requirePremium = authed
	.errors({
		PREMIUM_REQUIRED: { status: 402, message: "Premium seat required" },
	})
	.use(async ({ context, next, errors }) => {
		const [row] = await db
			.select({ userId: premiumSeats.userId })
			.from(premiumSeats)
			.where(eq(premiumSeats.userId, context.user.id))
			.limit(1);
		if (!row) throw errors.PREMIUM_REQUIRED();
		return next({ context });
	});
