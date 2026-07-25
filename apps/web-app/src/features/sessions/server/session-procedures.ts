import { and, desc, eq, gt, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { session as sessionTable } from "@/db/schema";
import { authed } from "@/orpc/context";

const sessionInput = z.object({
	sessionId: z.string().min(1).max(255),
});

export interface ActiveSession {
	id: string;
	ipAddress: string | null;
	userAgent: string | null;
	updatedAt: Date;
	isCurrent: boolean;
}

export const listSessions = authed.handler(
	async ({ context }): Promise<ActiveSession[]> => {
		const rows = await db
			.select({
				id: sessionTable.id,
				ipAddress: sessionTable.ipAddress,
				userAgent: sessionTable.userAgent,
				updatedAt: sessionTable.updatedAt,
			})
			.from(sessionTable)
			.where(
				and(
					eq(sessionTable.userId, context.user.id),
					gt(sessionTable.expiresAt, new Date()),
				),
			)
			.orderBy(desc(sessionTable.updatedAt));

		return rows
			.map((row) => ({
				...row,
				isCurrent: row.id === context.currentSession.id,
			}))
			.sort((a, b) => Number(b.isCurrent) - Number(a.isCurrent));
	},
);

export const revokeSession = authed
	.errors({
		CURRENT_SESSION: {
			status: 400,
			message: "The current session cannot be revoked here",
		},
		NOT_FOUND: { status: 404, message: "Session not found" },
	})
	.input(sessionInput)
	.handler(async ({ input, context, errors }) => {
		if (input.sessionId === context.currentSession.id) {
			throw errors.CURRENT_SESSION();
		}

		const revoked = await db
			.delete(sessionTable)
			.where(
				and(
					eq(sessionTable.id, input.sessionId),
					eq(sessionTable.userId, context.user.id),
				),
			)
			.returning({ id: sessionTable.id });

		if (revoked.length === 0) throw errors.NOT_FOUND();
		return { revoked: true };
	});

export const revokeOtherSessions = authed.handler(async ({ context }) => {
	const revoked = await db
		.delete(sessionTable)
		.where(
			and(
				eq(sessionTable.userId, context.user.id),
				ne(sessionTable.id, context.currentSession.id),
			),
		)
		.returning({ id: sessionTable.id });

	return { revokedCount: revoked.length };
});
