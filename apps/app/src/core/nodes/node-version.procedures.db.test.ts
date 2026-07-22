import { call } from "@orpc/server";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createNode, updateNodeContent } from "@/core/nodes/node.procedures";
import { nodeVersions } from "@/core/nodes/node.schema";
import {
	listNodeVersions,
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
	it("does not snapshot a node's initial null content on its first edit", async () => {
		const node = await call(createNode, { parentId: null }, { context });
		await call(
			updateNodeContent,
			{ id: node.id, content: content("first") },
			{ context },
		);

		const versions = await call(listNodeVersions, { id: node.id }, { context });
		expect(versions).toHaveLength(0);
	});

	it("snapshots the prior content on every subsequent edit", async () => {
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
		expect(versions).toHaveLength(1);
		expect(versions[0].content).toEqual(content("first"));
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
		expect(versionsBeforeRestore).toHaveLength(1);
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
		expect(versionsAfterRestore).toHaveLength(2);
		expect(versionsAfterRestore.map((v) => v.content)).toEqual(
			expect.arrayContaining([content("first"), content("second")]),
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

describe("premium gate", () => {
	it("rejects listNodeVersions/restoreNodeVersion with PREMIUM_REQUIRED for a user without a seat", async () => {
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
