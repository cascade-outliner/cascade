import { call } from "@orpc/server";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "../../../db";
import type { ORPCContext } from "../../../orpc/context";
import {
	createTestUser,
	deleteTestUser,
} from "../../../test-support/database-harness";
import {
	createNode,
	deleteNode,
	deleteTag,
	duplicateNode,
	listNodes,
	moveNode,
	setNodeDueDate,
	setNodeTags,
	setNodeType,
	updateNodeContent,
} from "../../nodes/server/procedures";
import { requestPremiumSeat } from "../../premium/server/premium-procedures";
import { purgeTreeHistory } from "./purge-tree-history";
import {
	getTreeHistoryEntry,
	listTreeHistory,
	restoreTreeHistoryEntry,
} from "./tree-history-procedures";
import { handleTreeHistoryPurgeRequest } from "./tree-history-purge-api";
import { treeHistoryEvents } from "./tree-history-table";

let userId: string;
let context: ORPCContext;

const content = (text: string) => ({
	root: {
		type: "root",
		children: [
			{
				type: "paragraph",
				children: [{ type: "text", text }],
			},
		],
	},
});

beforeEach(async () => {
	const testUser = await createTestUser();
	userId = testUser.user.id;
	context = testUser.context;
});

afterEach(async () => {
	await deleteTestUser(userId);
});

describe("tree history recording", () => {
	it("records only premium mutations and suppresses semantic no-ops", async () => {
		await call(createNode, { parentId: null }, { context });
		expect(
			await db
				.select()
				.from(treeHistoryEvents)
				.where(eq(treeHistoryEvents.userId, userId)),
		).toHaveLength(0);

		await call(requestPremiumSeat, undefined, { context });
		const node = await call(createNode, { parentId: null }, { context });
		await call(setNodeDueDate, { id: node.id, dueDate: null }, { context });
		const history = await call(listTreeHistory, { limit: 100 }, { context });
		expect(history.items).toHaveLength(1);
		expect(history.items[0]).toMatchObject({
			kind: "node_created",
			nodeId: node.id,
			restorable: false,
		});
	});

	it("paginates newest-first without gaps", async () => {
		await call(requestPremiumSeat, undefined, { context });
		for (let index = 0; index < 3; index++) {
			await call(createNode, { parentId: null }, { context });
		}
		const first = await call(listTreeHistory, { limit: 2 }, { context });
		expect(first.items).toHaveLength(2);
		expect(first.nextCursor).not.toBeNull();
		const second = await call(
			listTreeHistory,
			{ limit: 2, cursor: first.nextCursor },
			{ context },
		);
		expect(second.items).toHaveLength(1);
		expect(
			new Set([...first.items, ...second.items].map(({ id }) => id)).size,
		).toBe(3);
	});

	it("never exposes another user's timeline", async () => {
		await call(requestPremiumSeat, undefined, { context });
		const own = await call(createNode, { parentId: null }, { context });
		const other = await createTestUser();
		try {
			await call(requestPremiumSeat, undefined, { context: other.context });
			const foreign = await call(
				createNode,
				{ parentId: null },
				{ context: other.context },
			);
			const history = await call(listTreeHistory, { limit: 100 }, { context });
			expect(history.items.map(({ nodeId }) => nodeId)).toContain(own.id);
			expect(history.items.map(({ nodeId }) => nodeId)).not.toContain(
				foreign.id,
			);
		} finally {
			await deleteTestUser(other.user.id);
		}
	});

	it("records each semantic mutation kind and groups duplicated subtrees", async () => {
		await call(requestPremiumSeat, undefined, { context });
		const root = await call(createNode, { parentId: null }, { context });
		const child = await call(createNode, { parentId: null }, { context });
		await call(
			updateNodeContent,
			{ id: root.id, content: content("root") },
			{ context },
		);
		await call(
			moveNode,
			{ id: child.id, parentId: root.id, position: "append" },
			{ context },
		);
		await call(
			setNodeType,
			{ id: root.id, type: "task", metadata: { completed: false } },
			{ context },
		);
		await call(
			setNodeDueDate,
			{ id: root.id, dueDate: "2026-10-10" },
			{ context },
		);
		await call(setNodeTags, { id: root.id, tags: ["tracked"] }, { context });
		const duplicate = await call(duplicateNode, { id: root.id }, { context });
		await call(deleteTag, { name: "tracked" }, { context });
		await call(deleteNode, { id: duplicate.id }, { context });

		const history = await call(listTreeHistory, { limit: 100 }, { context });
		const kinds = history.items.map(({ kind }) => kind);
		expect(kinds).toEqual(
			expect.arrayContaining([
				"node_created",
				"content_changed",
				"node_moved",
				"type_changed",
				"due_date_changed",
				"tags_changed",
				"subtree_duplicated",
				"tag_deleted",
				"subtree_deleted",
			]),
		);
		const duplication = history.items.find(
			({ kind }) => kind === "subtree_duplicated",
		);
		const detail = await call(
			getTreeHistoryEntry,
			{ id: duplication?.id as string },
			{ context },
		);
		expect(detail.snapshots).toHaveLength(2);
	});

	it("rolls history back when its mutation is rejected", async () => {
		await call(requestPremiumSeat, undefined, { context });
		const parent = await call(createNode, { parentId: null }, { context });
		const child = await call(createNode, { parentId: parent.id }, { context });
		await expect(
			call(
				moveNode,
				{
					id: parent.id,
					parentId: child.id,
					position: "append",
				},
				{ context },
			),
		).rejects.toMatchObject({ code: "INVALID_MOVE" });
		const history = await call(listTreeHistory, { limit: 100 }, { context });
		expect(history.items.some(({ kind }) => kind === "node_moved")).toBe(false);
	});
});

describe("tree history restoration", () => {
	it("restores only content and records the restoration as a linked event", async () => {
		await call(requestPremiumSeat, undefined, { context });
		const node = await call(createNode, { parentId: null }, { context });
		await call(
			updateNodeContent,
			{ id: node.id, content: content("new") },
			{ context },
		);
		await call(
			setNodeDueDate,
			{ id: node.id, dueDate: "2026-08-12" },
			{ context },
		);
		const history = await call(listTreeHistory, { limit: 100 }, { context });
		const edit = history.items.find(({ kind }) => kind === "content_changed");
		expect(edit).toBeDefined();

		await call(
			restoreTreeHistoryEntry,
			{ id: edit?.id as string },
			{ context },
		);
		const [restored] = await call(listNodes, { parentId: null }, { context });
		expect(restored.content).toBeNull();
		expect(restored.dueDate).toBe("2026-08-12");

		const after = await call(listTreeHistory, { limit: 100 }, { context });
		expect(after.items[0]).toMatchObject({
			kind: "content_changed",
			restoredFromEventId: edit?.id,
		});
	});

	it("restores a deleted subtree with ids, structure, tags, and due dates", async () => {
		await call(requestPremiumSeat, undefined, { context });
		const root = await call(createNode, { parentId: null }, { context });
		const child = await call(createNode, { parentId: root.id }, { context });
		await call(
			setNodeDueDate,
			{ id: root.id, dueDate: "2026-09-01" },
			{ context },
		);
		await call(setNodeTags, { id: child.id, tags: ["saved"] }, { context });
		await call(deleteNode, { id: root.id }, { context });

		const history = await call(listTreeHistory, { limit: 100 }, { context });
		const deletion = history.items.find(
			({ kind }) => kind === "subtree_deleted",
		);
		expect(deletion).toMatchObject({ nodeDeleted: true, restorable: true });
		const detail = await call(
			getTreeHistoryEntry,
			{ id: deletion?.id as string },
			{ context },
		);
		expect(detail.snapshots).toHaveLength(2);

		await call(
			restoreTreeHistoryEntry,
			{ id: deletion?.id as string },
			{ context },
		);
		const [restoredRoot] = await call(
			listNodes,
			{ parentId: null },
			{ context },
		);
		const [restoredChild] = await call(
			listNodes,
			{ parentId: restoredRoot.id },
			{ context },
		);
		expect(restoredRoot).toMatchObject({
			id: root.id,
			dueDate: "2026-09-01",
		});
		expect(restoredChild).toMatchObject({
			id: child.id,
			tags: ["saved"],
		});
	});
});

describe("tree history retention", () => {
	it("purges through the token-protected maintenance API", async () => {
		await call(requestPremiumSeat, undefined, { context });
		await call(createNode, { parentId: null }, { context });
		const token = "tree-history-test-token-32-characters";
		const request = (authorization: string) =>
			new Request("http://localhost/api/maintenance/purge-tree-history", {
				method: "POST",
				headers: {
					authorization,
					"content-type": "application/json",
				},
				body: JSON.stringify({ days: 0, dryRun: false }),
			});

		const unauthorized = await handleTreeHistoryPurgeRequest(
			request("Bearer wrong"),
			token,
		);
		expect(unauthorized.status).toBe(401);

		const response = await handleTreeHistoryPurgeRequest(
			request(`Bearer ${token}`),
			token,
		);
		expect(response.status).toBe(200);
		const body = (await response.json()) as {
			days: number;
			dryRun: boolean;
			purgedCount: number;
		};
		expect(body).toMatchObject({
			days: 0,
			dryRun: false,
		});
		expect(body.purgedCount).toBeGreaterThan(0);
		expect(
			await db
				.select()
				.from(treeHistoryEvents)
				.where(eq(treeHistoryEvents.userId, userId)),
		).toHaveLength(0);
	});

	it("--days=0 purges all existing history", async () => {
		await call(requestPremiumSeat, undefined, { context });
		await call(createNode, { parentId: null }, { context });
		const [event] = await db
			.select({ id: treeHistoryEvents.id })
			.from(treeHistoryEvents)
			.where(eq(treeHistoryEvents.userId, userId));

		expect((await purgeTreeHistory(0, true)).purgedIds).toContain(event.id);
		expect((await purgeTreeHistory(0)).purgedIds).toContain(event.id);
		expect(
			await db
				.select()
				.from(treeHistoryEvents)
				.where(eq(treeHistoryEvents.userId, userId)),
		).toHaveLength(0);
	});

	it("hides and purges entries older than the configured window", async () => {
		await call(requestPremiumSeat, undefined, { context });
		await call(createNode, { parentId: null }, { context });
		const [event] = await db
			.select({ id: treeHistoryEvents.id })
			.from(treeHistoryEvents)
			.where(eq(treeHistoryEvents.userId, userId));
		await db
			.update(treeHistoryEvents)
			.set({ createdAt: new Date("2020-01-01T00:00:00.000Z") })
			.where(eq(treeHistoryEvents.id, event.id));

		const history = await call(listTreeHistory, { limit: 100 }, { context });
		expect(history.items).toHaveLength(0);
		expect((await purgeTreeHistory(30, true)).purgedIds).toContain(event.id);
		expect((await purgeTreeHistory(30)).purgedIds).toContain(event.id);
	});
});
