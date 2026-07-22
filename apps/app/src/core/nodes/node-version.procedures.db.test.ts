import { call } from "@orpc/server";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	createNode,
	deleteNode,
	listNodes,
	updateNodeContent,
} from "@/core/nodes/node.procedures";
import { nodeVersions } from "@/core/nodes/node.schema";
import {
	listNodeVersions,
	listTreeVersions,
	restoreNodeVersion,
} from "@/core/nodes/node-version.procedures";
import { requestPremiumSeat } from "@/core/premium/premium.procedures";
import { db } from "@/db";
import type { ORPCContext } from "@/orpc/context";
import { createTestUser, deleteTestUser } from "@/test-db/harness";

let userId: string;
let context: ORPCContext;

beforeEach(async () => {
	const testUser = await createTestUser();
	userId = testUser.user.id;
	context = testUser.context;
	// Version history is premium-gated; grant a seat so the tests below
	// (which aren't about the gate itself) exercise the real behavior.
	await call(requestPremiumSeat, undefined, { context });
});

afterEach(async () => {
	await deleteTestUser(userId);
});

function content(text: string) {
	return {
		root: {
			type: "root",
			children: [
				{
					type: "paragraph",
					children: [{ type: "text", text }],
				},
			],
		},
	};
}

describe("updateNodeContent snapshotting", () => {
	it("snapshots a node's creation (null content) on its first edit", async () => {
		const node = await call(createNode, { parentId: null }, { context });
		await call(
			updateNodeContent,
			{ id: node.id, content: content("first") },
			{ context },
		);

		const versions = await call(listNodeVersions, { id: node.id }, { context });
		expect(versions).toHaveLength(1);
		expect(versions[0].content).toBeNull();
	});

	it("snapshots the prior content on every edit, including creation", async () => {
		const node = await call(createNode, { parentId: null }, { context });
		await call(
			updateNodeContent,
			{ id: node.id, content: content("first") },
			{ context },
		);
		await call(
			updateNodeContent,
			{ id: node.id, content: content("second") },
			{ context },
		);

		const versions = await call(listNodeVersions, { id: node.id }, { context });
		expect(versions).toHaveLength(2);
		expect(versions.map((v) => v.content)).toEqual([content("first"), null]);
	});

	it("rejects an unknown node id with NOT_FOUND", async () => {
		await expect(
			call(
				updateNodeContent,
				{ id: crypto.randomUUID(), content: content("x") },
				{ context },
			),
		).rejects.toMatchObject({ code: "NOT_FOUND" });
	});
});

describe("restoreNodeVersion", () => {
	it("restores a prior version's content and preserves the rest of the timeline", async () => {
		const node = await call(createNode, { parentId: null }, { context });
		await call(
			updateNodeContent,
			{ id: node.id, content: content("first") },
			{ context },
		);
		await call(
			updateNodeContent,
			{ id: node.id, content: content("second") },
			{ context },
		);

		const versionsBeforeRestore = await call(
			listNodeVersions,
			{ id: node.id },
			{ context },
		);
		// [content("first") (from the "first" -> "second" edit), null (from
		// creation, the "first" edit)].
		expect(versionsBeforeRestore).toHaveLength(2);
		const firstVersion = versionsBeforeRestore[0];

		const restored = await call(
			restoreNodeVersion,
			{ id: firstVersion.id },
			{ context },
		);
		expect(restored.content).toEqual(content("first"));

		const versionsAfterRestore = await call(
			listNodeVersions,
			{ id: node.id },
			{ context },
		);
		expect(versionsAfterRestore).toHaveLength(3);
		expect(versionsAfterRestore.map((v) => v.content)).toEqual(
			expect.arrayContaining([null, content("first"), content("second")]),
		);
	});

	it("rejects an unknown version id with NOT_FOUND", async () => {
		await expect(
			call(restoreNodeVersion, { id: crypto.randomUUID() }, { context }),
		).rejects.toMatchObject({ code: "NOT_FOUND" });
	});

	it("rejects a version id belonging to another user with NOT_FOUND", async () => {
		const other = await createTestUser();
		try {
			await call(requestPremiumSeat, undefined, { context: other.context });
			const node = await call(
				createNode,
				{ parentId: null },
				{ context: other.context },
			);
			await call(
				updateNodeContent,
				{ id: node.id, content: content("first") },
				{ context: other.context },
			);
			await call(
				updateNodeContent,
				{ id: node.id, content: content("second") },
				{ context: other.context },
			);
			const versions = await call(
				listNodeVersions,
				{ id: node.id },
				{ context: other.context },
			);

			await expect(
				call(restoreNodeVersion, { id: versions[0].id }, { context }),
			).rejects.toMatchObject({ code: "NOT_FOUND" });
		} finally {
			await deleteTestUser(other.user.id);
		}
	});
});

describe("listTreeVersions", () => {
	it("lists versions across every node in the tree, newest first", async () => {
		const nodeA = await call(createNode, { parentId: null }, { context });
		const nodeB = await call(createNode, { parentId: null }, { context });
		// A node's first edit now snapshots its creation (null content), so a
		// single edit per node is enough to produce a version.
		await call(
			updateNodeContent,
			{ id: nodeA.id, content: content("a1") },
			{ context },
		);
		await call(
			updateNodeContent,
			{ id: nodeB.id, content: content("b1") },
			{ context },
		);

		const versions = await call(listTreeVersions, undefined, { context });
		expect(versions.map((v) => v.content)).toEqual([null, null]);
		expect(versions.map((v) => v.nodeId)).toEqual([nodeB.id, nodeA.id]);
	});

	it("does not include another user's versions", async () => {
		const other = await createTestUser();
		try {
			await call(requestPremiumSeat, undefined, { context: other.context });
			const otherNode = await call(
				createNode,
				{ parentId: null },
				{ context: other.context },
			);
			await call(
				updateNodeContent,
				{ id: otherNode.id, content: content("first") },
				{ context: other.context },
			);
			await call(
				updateNodeContent,
				{ id: otherNode.id, content: content("second") },
				{ context: other.context },
			);

			const node = await call(createNode, { parentId: null }, { context });
			await call(
				updateNodeContent,
				{ id: node.id, content: content("mine-first") },
				{ context },
			);
			await call(
				updateNodeContent,
				{ id: node.id, content: content("mine-second") },
				{ context },
			);

			const versions = await call(listTreeVersions, undefined, { context });
			expect(versions).toHaveLength(2);
			expect(versions.every((v) => v.nodeId === node.id)).toBe(true);
		} finally {
			await deleteTestUser(other.user.id);
		}
	});
});

describe("deleting and restoring a node", () => {
	it("keeps a deleted node's versions listed, flagged with nodeDeletedAt", async () => {
		const node = await call(createNode, { parentId: null }, { context });
		await call(
			updateNodeContent,
			{ id: node.id, content: content("first") },
			{ context },
		);
		await call(deleteNode, { id: node.id }, { context });

		const versions = await call(listNodeVersions, { id: node.id }, { context });
		expect(versions).toHaveLength(1);
		expect(versions[0].nodeDeletedAt).not.toBeNull();

		const treeVersions = await call(listTreeVersions, undefined, { context });
		expect(treeVersions).toHaveLength(1);
		expect(treeVersions[0].nodeDeletedAt).not.toBeNull();
	});

	it("restoring a deleted node's version brings back its whole subtree", async () => {
		const parent = await call(createNode, { parentId: null }, { context });
		const child = await call(createNode, { parentId: parent.id }, { context });
		await call(
			updateNodeContent,
			{ id: parent.id, content: content("parent-first") },
			{ context },
		);
		await call(
			updateNodeContent,
			{ id: child.id, content: content("child-first") },
			{ context },
		);

		await call(deleteNode, { id: parent.id }, { context });
		expect(
			await call(listNodes, { parentId: null }, { context }),
		).not.toContainEqual(expect.objectContaining({ id: parent.id }));

		const versions = await call(
			listNodeVersions,
			{ id: parent.id },
			{ context },
		);
		const restored = await call(
			restoreNodeVersion,
			{ id: versions[0].id },
			{ context },
		);
		expect(restored.content).toBeNull();

		const roots = await call(listNodes, { parentId: null }, { context });
		expect(roots.map((r) => r.id)).toContain(parent.id);
		const children = await call(
			listNodes,
			{ parentId: parent.id },
			{ context },
		);
		expect(children.map((r) => r.id)).toContain(child.id);
	});

	it("restores as a root node when the original parent is also deleted", async () => {
		const grandparent = await call(createNode, { parentId: null }, { context });
		const parent = await call(
			createNode,
			{ parentId: grandparent.id },
			{ context },
		);
		await call(
			updateNodeContent,
			{ id: parent.id, content: content("first") },
			{ context },
		);

		// Delete just the parent (and its version's still-active grandparent),
		// then separately delete the grandparent too, so by the time the
		// parent is restored, its original parent (the grandparent) is itself
		// deleted.
		await call(deleteNode, { id: parent.id }, { context });
		await call(deleteNode, { id: grandparent.id }, { context });

		const versions = await call(
			listNodeVersions,
			{ id: parent.id },
			{ context },
		);
		await call(restoreNodeVersion, { id: versions[0].id }, { context });

		const roots = await call(listNodes, { parentId: null }, { context });
		expect(roots.map((r) => r.id)).toContain(parent.id);
	});

	it("lets a new sibling reuse a deleted node's old order slot without conflict", async () => {
		const parentNode = await call(createNode, { parentId: null }, { context });
		const a = await call(createNode, { parentId: parentNode.id }, { context });
		const b = await call(
			createNode,
			{ parentId: parentNode.id, afterId: a.id },
			{ context },
		);
		await call(deleteNode, { id: b.id }, { context });

		// Creating another node right after `a` recomputes a fractional-index
		// key from the same (a, next) bounds `b` was originally generated
		// from — if `b`'s deleted row still held that exact slot, this would
		// violate the (userId, parentId, order) unique constraint.
		await expect(
			call(createNode, { parentId: parentNode.id, afterId: a.id }, { context }),
		).resolves.toBeDefined();
	});
});

describe("premium gate", () => {
	it("rejects listNodeVersions/restoreNodeVersion/listTreeVersions with PREMIUM_REQUIRED for a user without a seat", async () => {
		const nonPremium = await createTestUser();
		try {
			const node = await call(
				createNode,
				{ parentId: null },
				{ context: nonPremium.context },
			);
			await call(
				updateNodeContent,
				{ id: node.id, content: content("first") },
				{ context: nonPremium.context },
			);
			await call(
				updateNodeContent,
				{ id: node.id, content: content("second") },
				{ context: nonPremium.context },
			);

			await expect(
				call(
					listNodeVersions,
					{ id: node.id },
					{ context: nonPremium.context },
				),
			).rejects.toMatchObject({ code: "PREMIUM_REQUIRED" });

			await expect(
				call(
					restoreNodeVersion,
					{ id: crypto.randomUUID() },
					{ context: nonPremium.context },
				),
			).rejects.toMatchObject({ code: "PREMIUM_REQUIRED" });

			await expect(
				call(listTreeVersions, undefined, { context: nonPremium.context }),
			).rejects.toMatchObject({ code: "PREMIUM_REQUIRED" });
		} finally {
			await deleteTestUser(nonPremium.user.id);
		}
	});

	it("does not write any node_versions rows for a user without a seat", async () => {
		const nonPremium = await createTestUser();
		try {
			const node = await call(
				createNode,
				{ parentId: null },
				{ context: nonPremium.context },
			);
			await call(
				updateNodeContent,
				{ id: node.id, content: content("first") },
				{ context: nonPremium.context },
			);
			await call(
				updateNodeContent,
				{ id: node.id, content: content("second") },
				{ context: nonPremium.context },
			);

			const rows = await db
				.select({ id: nodeVersions.id })
				.from(nodeVersions)
				.where(eq(nodeVersions.nodeId, node.id));
			expect(rows).toHaveLength(0);
		} finally {
			await deleteTestUser(nonPremium.user.id);
		}
	});

	it("starts writing node_versions rows as soon as a seat is granted", async () => {
		const upgrader = await createTestUser();
		try {
			const node = await call(
				createNode,
				{ parentId: null },
				{ context: upgrader.context },
			);
			await call(
				updateNodeContent,
				{ id: node.id, content: content("before upgrade") },
				{ context: upgrader.context },
			);

			const rowsBeforeUpgrade = await db
				.select({ id: nodeVersions.id })
				.from(nodeVersions)
				.where(eq(nodeVersions.nodeId, node.id));
			expect(rowsBeforeUpgrade).toHaveLength(0);

			await call(requestPremiumSeat, undefined, { context: upgrader.context });
			await call(
				updateNodeContent,
				{ id: node.id, content: content("after upgrade") },
				{ context: upgrader.context },
			);

			const versions = await call(
				listNodeVersions,
				{ id: node.id },
				{ context: upgrader.context },
			);
			expect(versions).toHaveLength(1);
			expect(versions[0].content).toEqual(content("before upgrade"));
		} finally {
			await deleteTestUser(upgrader.user.id);
		}
	});
});
