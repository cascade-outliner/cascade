import { call } from "@orpc/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { exportAccountData } from "@/features/account-data/server/account-data-procedures";
import { createNode } from "@/features/nodes/server/procedures";
import { requestPremiumSeat } from "@/features/premium/server/premium-procedures";
import { updateSettings } from "@/features/settings/server/settings-procedures";
import type { ORPCContext } from "@/orpc/context";
import {
	createTestUser,
	deleteTestUser,
} from "@/test-support/database-harness";

let userId: string;
let userEmail: string;
let context: ORPCContext;
let foreignUserId: string;
let foreignContext: ORPCContext;

beforeEach(async () => {
	const testUser = await createTestUser();
	userId = testUser.user.id;
	userEmail = testUser.user.email;
	context = testUser.context;

	const foreign = await createTestUser();
	foreignUserId = foreign.user.id;
	foreignContext = foreign.context;
});

afterEach(async () => {
	await deleteTestUser(userId);
	await deleteTestUser(foreignUserId);
});

describe("exportAccountData", () => {
	it("returns empty collections and defaults for a fresh user", async () => {
		const result = await call(exportAccountData, undefined, { context });

		expect(result.account).toMatchObject({ id: userId, email: userEmail });
		expect(result.settings).toEqual({});
		expect(result.premium).toEqual({ isPremium: false, grantedAt: null });
		expect(result.nodes).toEqual([]);
		expect(result.tags).toEqual([]);
		expect(result.nodeTags).toEqual([]);
		expect(result.treeHistoryEvents).toEqual([]);
		expect(result.treeHistorySnapshots).toEqual([]);
	});

	it("includes this user's nodes, tags, due dates, settings, and premium status", async () => {
		await call(requestPremiumSeat, undefined, { context });
		await call(updateSettings, { indentSize: 32 }, { context });
		const node = await call(
			createNode,
			{
				parentId: null,
				dueDate: "2026-08-10",
				tags: ["work"],
			},
			{ context },
		);

		const result = await call(exportAccountData, undefined, { context });

		expect(result.nodes.map((n) => n.id)).toEqual([node.id]);
		expect(result.nodes[0]).toMatchObject({ dueDate: "2026-08-10" });
		expect(result.tags.map((t) => t.name)).toEqual(["work"]);
		expect(result.nodeTags).toEqual([
			{ nodeId: node.id, tagId: result.tags[0].id },
		]);
		expect(result.settings).toEqual({ indentSize: 32 });
		expect(result.premium.isPremium).toBe(true);
		expect(result.premium.grantedAt).not.toBeNull();
		// Premium node mutations are recorded in tree history.
		expect(result.treeHistoryEvents.length).toBeGreaterThan(0);
		expect(result.treeHistorySnapshots.length).toBeGreaterThan(0);
		expect(
			result.treeHistoryEvents.every((event) => event.userId === userId),
		).toBe(true);
	});

	it("never includes another user's data", async () => {
		await call(
			createNode,
			{ parentId: null, tags: ["foreign"] },
			{
				context: foreignContext,
			},
		);

		const result = await call(exportAccountData, undefined, { context });

		expect(result.nodes).toEqual([]);
		expect(result.tags).toEqual([]);
	});
});
