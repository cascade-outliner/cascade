import { randomUUID } from "node:crypto";
import { Test } from "@nestjs/testing";
import { sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DatabaseModule } from "../../../database/database.module";
import {
	DRIZZLE,
	type DrizzleClient,
} from "../../../database/drizzle.provider";
import { nodes, statuses, tags } from "../../../database/schema/node-tables";
import { GetNodeService } from "../application/get-node.service";
import { GetNodeAncestorsService } from "../application/get-node-ancestors.service";
import { ResolveNodeSlugService } from "../application/resolve-node-slug.service";
import { NodesRepository } from "./nodes.repository";

const content = (text: string) => ({
	root: {
		type: "root",
		children: [{ type: "text", text }],
	},
});

describe("NodesRepository (Postgres integration)", () => {
	let db: DrizzleClient;
	let repository: NodesRepository;
	let getNode: GetNodeService;
	let getAncestors: GetNodeAncestorsService;
	let resolveSlug: ResolveNodeSlugService;
	let userId: string;

	beforeEach(async () => {
		const moduleRef = await Test.createTestingModule({
			imports: [DatabaseModule],
			providers: [
				NodesRepository,
				GetNodeService,
				GetNodeAncestorsService,
				ResolveNodeSlugService,
			],
		}).compile();

		db = moduleRef.get(DRIZZLE);
		repository = moduleRef.get(NodesRepository);
		getNode = moduleRef.get(GetNodeService);
		getAncestors = moduleRef.get(GetNodeAncestorsService);
		resolveSlug = moduleRef.get(ResolveNodeSlugService);

		// Raw SQL rather than @cascade/auth/schema's `user` table — see
		// database/schema/tree-history-table.ts for why the two DrizzleClient
		// types can't mix.
		userId = randomUUID();
		await db.execute(sql`
			INSERT INTO "user" (id, name, email)
			VALUES (${userId}, 'db-test', ${`db-test-${userId}@example.test`})
		`);
	});

	afterEach(async () => {
		// node-tables.ts's userId columns intentionally have no FK to "user",
		// so cleanup here is explicit rather than cascading from the user delete.
		await db.delete(nodes).where(sql`user_id = ${userId}`);
		await db.delete(statuses).where(sql`user_id = ${userId}`);
		await db.delete(tags).where(sql`user_id = ${userId}`);
		await db.execute(sql`DELETE FROM "user" WHERE id = ${userId}`);
	});

	async function insertNode(
		overrides: Partial<typeof nodes.$inferInsert> = {},
	) {
		const [node] = await db
			.insert(nodes)
			.values({
				userId,
				content: content("Untitled"),
				order: "a0",
				...overrides,
			})
			.returning();
		return node;
	}

	it("findById scopes by user and returns null for another user's node", async () => {
		const node = await insertNode({ content: content("Mine") });

		expect(await repository.findById(node.id, userId)).toMatchObject({
			id: node.id,
			content: content("Mine"),
		});
		expect(await repository.findById(node.id, randomUUID())).toBeNull();
	});

	it("GetNodeService throws NotFoundException for a missing node", async () => {
		await expect(getNode.get(randomUUID(), userId)).rejects.toThrow();
	});

	it("findAncestors walks the parent chain root-first, scoped by user", async () => {
		const root = await insertNode({ content: content("Root"), order: "a0" });
		const child = await insertNode({
			content: content("Child"),
			parentId: root.id,
			order: "a1",
		});
		const grandchild = await insertNode({
			content: content("Grandchild"),
			parentId: child.id,
			order: "a2",
		});

		const chain = await getAncestors.get(grandchild.id, userId);
		expect(chain.map((row) => row.id)).toEqual([
			root.id,
			child.id,
			grandchild.id,
		]);
	});

	it("findVisibleTree returns every node flat, joined with status and tags", async () => {
		const [status] = await db
			.insert(statuses)
			.values({ userId, name: "Doing", color: "sky" })
			.returning();
		const [tag] = await db
			.insert(tags)
			.values({ userId, name: "urgent" })
			.returning();
		const node = await insertNode({ statusId: status.id });
		await db.execute(
			sql`INSERT INTO node_tags (node_id, tag_id) VALUES (${node.id}, ${tag.id})`,
		);

		const rows = await repository.findVisibleTree(userId);
		const row = rows.find((r) => r.id === node.id);
		expect(row).toMatchObject({
			status_id: status.id,
			status_name: "Doing",
			tags: ["urgent"],
		});
	});

	it("findByParent orders siblings by fractional index and scopes by user", async () => {
		const root = await insertNode({ order: "a0" });
		const second = await insertNode({ parentId: root.id, order: "b" });
		const first = await insertNode({ parentId: root.id, order: "a" });

		const children = await repository.findByParent(root.id, userId);
		expect(children.map((c) => c.id)).toEqual([first.id, second.id]);

		const roots = await repository.findByParent(null, userId);
		expect(roots.map((r) => r.id)).toContain(root.id);
	});

	it("resolveSlug: full UUID resolves directly", async () => {
		const node = await insertNode();
		await expect(resolveSlug.resolve(node.id, null, userId)).resolves.toEqual({
			id: node.id,
		});
	});

	it("resolveSlug: ambiguous first-block id prefix requires slugText to disambiguate", async () => {
		// Force a shared 8-hex-char first block by using two random UUIDs
		// isn't reliable, so directly construct two ids sharing a prefix.
		const prefix = randomUUID().slice(0, 8);
		const [a] = await db
			.insert(nodes)
			.values({
				id: `${prefix}-${randomUUID().slice(9)}`,
				userId,
				content: content("Alpha"),
				order: "a0",
			})
			.returning();
		const [b] = await db
			.insert(nodes)
			.values({
				id: `${prefix}-${randomUUID().slice(9)}`,
				userId,
				content: content("Beta"),
				order: "a1",
			})
			.returning();

		await expect(resolveSlug.resolve(prefix, null, userId)).rejects.toThrow();
		await expect(resolveSlug.resolve(prefix, "beta", userId)).resolves.toEqual({
			id: b.id,
		});
		await expect(resolveSlug.resolve(prefix, "alpha", userId)).resolves.toEqual(
			{ id: a.id },
		);
	});

	it("findDueSoon only returns nodes with a due date in the padded window", async () => {
		const near = await insertNode({
			dueDate: new Date().toISOString().slice(0, 10),
		});
		await insertNode({ dueDate: "2000-01-01" });
		await insertNode();

		const rows = await repository.findDueSoon(userId);
		expect(rows.map((r) => r.id)).toEqual([near.id]);
	});

	it("findQuickOpenMatches finds nodes by search text and findQuickOpenAncestors returns their chain", async () => {
		const root = await insertNode({
			content: content("Groceries"),
			order: "a0",
		});
		const match = await insertNode({
			content: content("Buy milk"),
			parentId: root.id,
			order: "a1",
			searchText: "buy milk",
		});

		const matches = await repository.findQuickOpenMatches(userId, "milk");
		expect(matches.map((m) => m.id)).toEqual([match.id]);

		const ancestors = await repository.findQuickOpenAncestors(userId, matches);
		expect(ancestors).toEqual([
			expect.objectContaining({ match_id: match.id, id: root.id, depth: 1 }),
		]);
	});
});
