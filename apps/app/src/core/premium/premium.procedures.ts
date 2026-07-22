import { eq } from "drizzle-orm";
import { premiumSeats } from "@/core/premium/premium.schema";
import { db } from "@/db";
import { authed } from "@/orpc/context";

export interface PremiumStatus {
	isPremium: boolean;
	grantedAt: string | null;
}

async function readPremiumStatus(userId: string): Promise<PremiumStatus> {
	const [row] = await db
		.select({ grantedAt: premiumSeats.grantedAt })
		.from(premiumSeats)
		.where(eq(premiumSeats.userId, userId))
		.limit(1);
	return { isPremium: !!row, grantedAt: row?.grantedAt.toISOString() ?? null };
}

/** Whether the current user has a premium seat, and when it was granted. */
export const getPremiumStatus = authed.handler(
	async ({ context }): Promise<PremiumStatus> =>
		readPremiumStatus(context.user.id),
);

/** Grants the current user a premium seat immediately. Idempotent. */
export const requestPremiumSeat = authed.handler(
	async ({ context }): Promise<PremiumStatus> => {
		const [row] = await db
			.insert(premiumSeats)
			.values({ userId: context.user.id })
			.onConflictDoNothing({ target: premiumSeats.userId })
			.returning({ grantedAt: premiumSeats.grantedAt });
		if (row) {
			return { isPremium: true, grantedAt: row.grantedAt.toISOString() };
		}
		// Already had a seat — onConflictDoNothing returns nothing on conflict.
		return readPremiumStatus(context.user.id);
	},
);
