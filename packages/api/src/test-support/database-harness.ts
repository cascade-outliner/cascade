import { randomUUID } from "node:crypto";
import type { Session } from "@cascade/auth/server";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { user } from "../db/schema";
import type { ORPCContext } from "../orpc/context";

/** Inserts a throwaway user row and returns an oRPC context authenticated as them. */
export async function createTestUser(): Promise<{
	user: typeof user.$inferSelect;
	context: ORPCContext;
}> {
	const [inserted] = await db
		.insert(user)
		.values({
			id: randomUUID(),
			name: "db-test",
			email: `db-test-${randomUUID()}@example.test`,
		})
		.returning();

	return {
		user: inserted,
		context: {
			request: new Request("http://localhost/test"),
			session: { user: inserted } as unknown as Session,
		},
	};
}

/** Deletes the test user; FK cascades remove their nodes and tags. */
export async function deleteTestUser(userId: string): Promise<void> {
	await db.delete(user).where(eq(user.id, userId));
}
