import { call } from "@orpc/server";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db";
import {
	createNode,
	deleteNode,
	getNode,
	moveNode,
	setNodeTags,
	updateNodeContent,
} from "@/features/nodes/server/procedures";
import {
	createShare,
	getSharedTree,
	listShares,
	revokeShare,
} from "@/features/sharing/server/share-procedures";
import { treeShares } from "@/features/sharing/server/share-table";
import type { ORPCContext } from "@/orpc/context";
import {
	createTestUser,
	deleteTestUser,
} from "@/test-support/database-harness";

let ownerId: string;
let ownerContext: ORPCContext;
let otherUserId: string;
let otherUserContext: ORPCContext;

const anonymousContext: ORPCContext = {
	request: new Request("http://localhost/test"),
	session: null,
};

beforeEach(async () => {
	const owner = await createTestUser();
	ownerId = owner.user.id;
	ownerContext = owner.context;

	const other = await createTestUser();
	otherUserId = other.user.id;
	otherUserContext = other.context;
});

afterEach(async () => {
	await deleteTestUser(ownerId);
	await deleteTestUser(otherUserId);
});

describe("createShare", () => {
	it("creates a share for a node the caller owns", async () => {
		const node = await call(
			createNode,
			{ parentId: null },
			{ context: ownerContext },
		);

		const share = await call(
			createShare,
			{ nodeId: node.id },
			{ context: ownerContext },
		);

		expect(share.nodeId).toBe(node.id);
		expect(share.requireLogin).toBe(false);
		expect(share.revokedAt).toBeNull();
		expect(share.token.length).toBeGreaterThan(0);
	});

	it("rejects creating a share for a node the caller does not own", async () => {
		const node = await call(
			createNode,
			{ parentId: null },
			{ context: ownerContext },
		);

		await expect(
			call(createShare, { nodeId: node.id }, { context: otherUserContext }),
		).rejects.toMatchObject({ code: "NOT_FOUND" });
	});
});

describe("revokeShare", () => {
	it("revokes the caller's own share", async () => {
		const node = await call(
			createNode,
			{ parentId: null },
			{ context: ownerContext },
		);
		const share = await call(
			createShare,
			{ nodeId: node.id },
			{ context: ownerContext },
		);

		const result = await call(
			revokeShare,
			{ id: share.id },
			{ context: ownerContext },
		);
		expect(result.revoked).toBe(true);

		const [row] = await db
			.select()
			.from(treeShares)
			.where(eq(treeShares.id, share.id));
		expect(row?.revokedAt).not.toBeNull();
	});

	it("rejects revoking a share that isn't the caller's", async () => {
		const node = await call(
			createNode,
			{ parentId: null },
			{ context: ownerContext },
		);
		const share = await call(
			createShare,
			{ nodeId: node.id },
			{ context: ownerContext },
		);

		await expect(
			call(revokeShare, { id: share.id }, { context: otherUserContext }),
		).rejects.toMatchObject({ code: "NOT_FOUND" });
	});

	it("rejects revoking an already-revoked share", async () => {
		const node = await call(
			createNode,
			{ parentId: null },
			{ context: ownerContext },
		);
		const share = await call(
			createShare,
			{ nodeId: node.id },
			{ context: ownerContext },
		);
		await call(revokeShare, { id: share.id }, { context: ownerContext });

		await expect(
			call(revokeShare, { id: share.id }, { context: ownerContext }),
		).rejects.toMatchObject({ code: "NOT_FOUND" });
	});
});

describe("listShares", () => {
	it("only returns the caller's own shares", async () => {
		const ownerNode = await call(
			createNode,
			{ parentId: null },
			{ context: ownerContext },
		);
		await call(
			createShare,
			{ nodeId: ownerNode.id },
			{ context: ownerContext },
		);

		const otherNode = await call(
			createNode,
			{ parentId: null },
			{ context: otherUserContext },
		);
		await call(
			createShare,
			{ nodeId: otherNode.id },
			{ context: otherUserContext },
		);

		const ownerShares = await call(listShares, {}, { context: ownerContext });
		expect(ownerShares).toHaveLength(1);
		expect(ownerShares[0]?.nodeId).toBe(ownerNode.id);
	});

	it("filters by nodeId when given", async () => {
		const nodeA = await call(
			createNode,
			{ parentId: null },
			{ context: ownerContext },
		);
		const nodeB = await call(
			createNode,
			{ parentId: null },
			{ context: ownerContext },
		);
		await call(createShare, { nodeId: nodeA.id }, { context: ownerContext });
		await call(createShare, { nodeId: nodeB.id }, { context: ownerContext });

		const shares = await call(
			listShares,
			{ nodeId: nodeA.id },
			{ context: ownerContext },
		);
		expect(shares).toHaveLength(1);
		expect(shares[0]?.nodeId).toBe(nodeA.id);
	});
});

describe("getSharedTree (public read)", () => {
	it("returns the shared root and its descendants to an anonymous caller", async () => {
		const root = await call(
			createNode,
			{ parentId: null },
			{ context: ownerContext },
		);
		const child = await call(
			createNode,
			{ parentId: root.id },
			{ context: ownerContext },
		);
		await call(createNode, { parentId: child.id }, { context: ownerContext });
		const share = await call(
			createShare,
			{ nodeId: root.id },
			{ context: ownerContext },
		);

		const page = await call(
			getSharedTree,
			{ token: share.token, cursor: null, limit: 500 },
			{ context: anonymousContext },
		);

		expect(page.rootId).toBe(root.id);
		expect(page.rows.map((row) => row.id).sort()).toEqual(
			[root.id, child.id]
				.concat(
					page.rows
						.filter((row) => row.parentId === child.id)
						.map((row) => row.id),
				)
				.sort(),
		);
		expect(page.rows).toHaveLength(3);
	});

	it("never returns nodes outside the shared subtree, even siblings owned by the same user", async () => {
		const sharedRoot = await call(
			createNode,
			{ parentId: null },
			{ context: ownerContext },
		);
		const sharedChild = await call(
			createNode,
			{ parentId: sharedRoot.id },
			{ context: ownerContext },
		);
		const unrelatedRoot = await call(
			createNode,
			{ parentId: null },
			{ context: ownerContext },
		);
		const share = await call(
			createShare,
			{ nodeId: sharedRoot.id },
			{ context: ownerContext },
		);

		const page = await call(
			getSharedTree,
			{ token: share.token, cursor: null, limit: 500 },
			{ context: anonymousContext },
		);

		const returnedIds = page.rows.map((row) => row.id);
		expect(returnedIds).toContain(sharedRoot.id);
		expect(returnedIds).toContain(sharedChild.id);
		expect(returnedIds).not.toContain(unrelatedRoot.id);
	});

	it("paginates via cursor like visibleTree", async () => {
		const root = await call(
			createNode,
			{ parentId: null },
			{ context: ownerContext },
		);
		await call(createNode, { parentId: root.id }, { context: ownerContext });
		await call(createNode, { parentId: root.id }, { context: ownerContext });
		await call(createNode, { parentId: root.id }, { context: ownerContext });
		const share = await call(
			createShare,
			{ nodeId: root.id },
			{ context: ownerContext },
		);

		const firstPage = await call(
			getSharedTree,
			{ token: share.token, cursor: null, limit: 2 },
			{ context: anonymousContext },
		);
		expect(firstPage.rows).toHaveLength(2);
		expect(firstPage.nextCursor).not.toBeNull();

		const secondPage = await call(
			getSharedTree,
			{ token: share.token, cursor: firstPage.nextCursor, limit: 2 },
			{ context: anonymousContext },
		);
		expect(secondPage.rows.length).toBeGreaterThan(0);

		const allIds = new Set([
			...firstPage.rows.map((row) => row.id),
			...secondPage.rows.map((row) => row.id),
		]);
		expect(allIds.size).toBe(firstPage.rows.length + secondPage.rows.length);
	});

	it("rejects an unknown token", async () => {
		await expect(
			call(
				getSharedTree,
				{ token: "does-not-exist", cursor: null, limit: 500 },
				{ context: anonymousContext },
			),
		).rejects.toMatchObject({ code: "NOT_FOUND" });
	});

	it("rejects a revoked share's token", async () => {
		const root = await call(
			createNode,
			{ parentId: null },
			{ context: ownerContext },
		);
		const share = await call(
			createShare,
			{ nodeId: root.id },
			{ context: ownerContext },
		);
		await call(revokeShare, { id: share.id }, { context: ownerContext });

		await expect(
			call(
				getSharedTree,
				{ token: share.token, cursor: null, limit: 500 },
				{ context: anonymousContext },
			),
		).rejects.toMatchObject({ code: "GONE" });
	});

	it("requires a session for a requireLogin share, and accepts any signed-in user", async () => {
		const root = await call(
			createNode,
			{ parentId: null },
			{ context: ownerContext },
		);
		const share = await call(
			createShare,
			{ nodeId: root.id, requireLogin: true },
			{ context: ownerContext },
		);

		await expect(
			call(
				getSharedTree,
				{ token: share.token, cursor: null, limit: 500 },
				{ context: anonymousContext },
			),
		).rejects.toMatchObject({ code: "UNAUTHORIZED" });

		const page = await call(
			getSharedTree,
			{ token: share.token, cursor: null, limit: 500 },
			{ context: otherUserContext },
		);
		expect(page.rootId).toBe(root.id);
	});
});

describe("shared access grants no write capability", () => {
	it("still rejects mutations from a non-owner even though the node is shared", async () => {
		const root = await call(
			createNode,
			{ parentId: null },
			{ context: ownerContext },
		);
		const child = await call(
			createNode,
			{ parentId: root.id },
			{ context: ownerContext },
		);
		await call(createShare, { nodeId: root.id }, { context: ownerContext });

		await expect(
			call(
				updateNodeContent,
				{ id: root.id, content: null },
				{ context: otherUserContext },
			),
		).rejects.toMatchObject({ code: "NOT_FOUND" });

		// deleteNode is intentionally idempotent (no NOT_FOUND) for a missing id,
		// so the permission check here is that nothing was actually deleted.
		const deleteResult = await call(
			deleteNode,
			{ id: child.id },
			{ context: otherUserContext },
		);
		expect(deleteResult.childrenDeleted).toBe(0);
		const childStillExists = await call(
			getNode,
			{ id: child.id },
			{ context: ownerContext },
		);
		expect(childStillExists.id).toBe(child.id);

		await expect(
			call(
				moveNode,
				{ id: child.id, parentId: null, position: "append" },
				{ context: otherUserContext },
			),
		).rejects.toMatchObject({ code: "NOT_FOUND" });

		await expect(
			call(
				setNodeTags,
				{ id: root.id, tags: ["x"] },
				{ context: otherUserContext },
			),
		).rejects.toMatchObject({ code: "NOT_FOUND" });

		const stillOwned = await call(
			getNode,
			{ id: root.id },
			{ context: ownerContext },
		);
		expect(stillOwned.id).toBe(root.id);
	});
});
