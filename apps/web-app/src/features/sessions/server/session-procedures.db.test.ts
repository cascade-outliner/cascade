import { randomUUID } from "node:crypto";
import type { Session } from "@cascade/auth/server";
import { call } from "@orpc/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db";
import { session } from "@/db/schema";
import {
	listSessions,
	revokeOtherSessions,
	revokeSession,
} from "@/features/sessions/server/session-procedures";
import type { ORPCContext } from "@/orpc/context";
import {
	createTestUser,
	deleteTestUser,
} from "@/test-support/database-harness";

let userId: string;
let context: ORPCContext;
let currentSessionId: string;
let additionalUserIds: string[];

function sessionRow(
	overrides: Partial<typeof session.$inferInsert> = {},
): typeof session.$inferInsert {
	return {
		id: randomUUID(),
		token: randomUUID(),
		userId,
		expiresAt: new Date(Date.now() + 60_000),
		...overrides,
	};
}

beforeEach(async () => {
	const testUser = await createTestUser();
	additionalUserIds = [];
	userId = testUser.user.id;
	currentSessionId = randomUUID();
	const [currentSession] = await db
		.insert(session)
		.values(
			sessionRow({
				id: currentSessionId,
				ipAddress: "192.0.2.1",
				userAgent: "current-agent",
			}),
		)
		.returning();
	context = {
		...testUser.context,
		session: {
			user: testUser.user,
			session: currentSession,
		} as Session,
	};
});

afterEach(async () => {
	await Promise.all(additionalUserIds.map((id) => deleteTestUser(id)));
	await deleteTestUser(userId);
});

describe("session procedures", () => {
	it("lists only the user's active sessions with the current session first", async () => {
		const [other] = await db
			.insert(session)
			.values([
				sessionRow({
					updatedAt: new Date(Date.now() + 1_000),
					userAgent: "other-agent",
				}),
				sessionRow({
					expiresAt: new Date(Date.now() - 1_000),
					userAgent: "expired-agent",
				}),
			])
			.returning();
		const foreign = await createTestUser();
		additionalUserIds.push(foreign.user.id);
		await db.insert(session).values(
			sessionRow({
				userId: foreign.user.id,
				userAgent: "foreign-agent",
			}),
		);

		const result = await call(listSessions, undefined, { context });

		expect(result).toHaveLength(2);
		expect(result[0]).toMatchObject({
			id: currentSessionId,
			isCurrent: true,
		});
		expect(result[1]).toMatchObject({ id: other.id, isCurrent: false });
		expect(result.map((item) => item.userAgent)).not.toContain("expired-agent");
		expect(result.map((item) => item.userAgent)).not.toContain("foreign-agent");
	});

	it("revokes another owned session immediately", async () => {
		const [other] = await db.insert(session).values(sessionRow()).returning();

		await expect(
			call(revokeSession, { sessionId: other.id }, { context }),
		).resolves.toEqual({ revoked: true });

		const result = await call(listSessions, undefined, { context });
		expect(result.map((item) => item.id)).toEqual([currentSessionId]);
	});

	it("rejects current and foreign session revocation", async () => {
		await expect(
			call(revokeSession, { sessionId: currentSessionId }, { context }),
		).rejects.toMatchObject({ code: "CURRENT_SESSION" });

		const foreign = await createTestUser();
		additionalUserIds.push(foreign.user.id);
		const [foreignSession] = await db
			.insert(session)
			.values(sessionRow({ userId: foreign.user.id }))
			.returning();
		await expect(
			call(revokeSession, { sessionId: foreignSession.id }, { context }),
		).rejects.toMatchObject({ code: "NOT_FOUND" });
	});

	it("revokes every other session while preserving the current session", async () => {
		await db
			.insert(session)
			.values([
				sessionRow(),
				sessionRow({ expiresAt: new Date(Date.now() - 1_000) }),
			]);

		const result = await call(revokeOtherSessions, undefined, { context });

		expect(result).toEqual({ revokedCount: 2 });
		const remaining = await call(listSessions, undefined, { context });
		expect(remaining.map((item) => item.id)).toEqual([currentSessionId]);
	});
});
