import { and, eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db";
import { nodes } from "@/features/nodes/server/persistence/node-tables";
import { onboardingAnchoredNodeKeys } from "@/features/settings/model/settings.schema";
import { userSettings } from "@/features/settings/server/settings-table";
import {
	createTestUser,
	deleteTestUser,
} from "@/test-support/database-harness";
import { ensureOnboardingSampleTree } from "./ensure-sample-tree";

let userId: string;

beforeEach(async () => {
	const testUser = await createTestUser();
	userId = testUser.user.id;
});

afterEach(async () => {
	await deleteTestUser(userId);
});

async function ownedNodeIds(): Promise<string[]> {
	const rows = await db
		.select({ id: nodes.id })
		.from(nodes)
		.where(eq(nodes.userId, userId));
	return rows.map((row) => row.id);
}

async function insertRealNode(): Promise<string> {
	const [row] = await db
		.insert(nodes)
		.values({ userId, parentId: null, order: "z", content: null })
		.returning({ id: nodes.id });
	// biome-ignore lint/style/noNonNullAssertion: insert with .returning always yields a row
	return row!.id;
}

describe("ensureOnboardingSampleTree", () => {
	it("builds a full sample tree for an account that never had one", async () => {
		const patch = await ensureOnboardingSampleTree(userId);
		expect(patch.onboardingCompleted).toBe(false);
		const ids = patch.onboardingSampleNodeIds ?? {};
		expect(ids.root).toBeTruthy();
		for (const key of onboardingAnchoredNodeKeys) {
			expect(ids[key]).toBeTruthy();
		}

		const owned = await ownedNodeIds();
		// root + 5 anchored + 1 unanchored "delete me" hint node
		expect(owned).toHaveLength(7);
	});

	it("is a no-op when everything the tour needs already exists", async () => {
		const first = await ensureOnboardingSampleTree(userId);
		const countAfterFirst = (await ownedNodeIds()).length;

		const second = await ensureOnboardingSampleTree(userId);
		expect(second.onboardingSampleNodeIds).toEqual(
			first.onboardingSampleNodeIds,
		);
		expect((await ownedNodeIds()).length).toBe(countAfterFirst);
	});

	it("adds back only the single node a user deleted, leaving everything else untouched", async () => {
		const realNodeId = await insertRealNode();
		const first = await ensureOnboardingSampleTree(userId);
		const firstIds = first.onboardingSampleNodeIds ?? {};
		// biome-ignore lint/style/noNonNullAssertion: asserted present above
		const taskId = firstIds.task!;

		await db
			.delete(nodes)
			.where(and(eq(nodes.id, taskId), eq(nodes.userId, userId)));

		const second = await ensureOnboardingSampleTree(userId);
		const secondIds = second.onboardingSampleNodeIds ?? {};

		expect(secondIds.root).toBe(firstIds.root);
		expect(secondIds.createNode).toBe(firstIds.createNode);
		expect(secondIds.indentNode).toBe(firstIds.indentNode);
		expect(secondIds.focusDot).toBe(firstIds.focusDot);
		expect(secondIds.tagged).toBe(firstIds.tagged);
		expect(secondIds.task).toBeTruthy();
		expect(secondIds.task).not.toBe(taskId);

		const owned = await ownedNodeIds();
		expect(owned).toContain(realNodeId);
		expect(owned).toContain(secondIds.task);
		expect(owned).not.toContain(taskId);
	});

	it("rebuilds the whole tree when the root was deleted, without touching unrelated nodes", async () => {
		const realNodeId = await insertRealNode();
		const first = await ensureOnboardingSampleTree(userId);
		const firstIds = first.onboardingSampleNodeIds ?? {};
		// biome-ignore lint/style/noNonNullAssertion: asserted present above
		const rootId = firstIds.root!;

		// Deleting the root cascades away every child under it.
		await db
			.delete(nodes)
			.where(and(eq(nodes.id, rootId), eq(nodes.userId, userId)));

		const second = await ensureOnboardingSampleTree(userId);
		const secondIds = second.onboardingSampleNodeIds ?? {};
		expect(secondIds.root).toBeTruthy();
		expect(secondIds.root).not.toBe(rootId);
		for (const key of onboardingAnchoredNodeKeys) {
			expect(secondIds[key]).toBeTruthy();
		}

		const owned = await ownedNodeIds();
		expect(owned).toContain(realNodeId);
		// root + 5 anchored + 1 hint node + the untouched real node
		expect(owned).toHaveLength(8);
	});

	it("merges into the existing settings row rather than overwriting unrelated fields", async () => {
		await db
			.insert(userSettings)
			.values({ userId, settings: { theme: "dracula", indentSize: 24 } });

		const patch = await ensureOnboardingSampleTree(userId);
		expect(patch.theme).toBe("dracula");
		expect(patch.indentSize).toBe(24);
		expect(patch.onboardingCompleted).toBe(false);
	});
});
