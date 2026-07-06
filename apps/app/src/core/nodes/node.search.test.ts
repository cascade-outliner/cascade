import { call } from "@orpc/server";
import { generateKeyBetween } from "fractional-indexing";
import { beforeEach, describe, expect, test } from "vitest";
import { getNodeAncestors } from "@/core/nodes/node.procedures";
import { nodes } from "@/core/nodes/node.schema";
import { searchNodes } from "@/core/nodes/node.search";
import { db } from "@/db";

function textContent(text: string) {
	return {
		root: {
			type: "root",
			direction: "ltr",
			format: "",
			indent: 0,
			version: 1,
			children: [
				{
					type: "paragraph",
					direction: "ltr",
					format: "",
					indent: 0,
					version: 1,
					children: [
						{
							type: "text",
							text,
							detail: 0,
							format: 0,
							mode: "normal",
							style: "",
							version: 1,
						},
					],
				},
			],
		},
	};
}

async function insertNode(
	text: string,
	options: { parentId?: string | null; type?: "text" | "task" } = {},
): Promise<string> {
	const [row] = await db
		.insert(nodes)
		.values({
			parentId: options.parentId ?? null,
			order: generateKeyBetween(null, null),
			type: options.type ?? "text",
			content: textContent(text),
			searchText: text,
		})
		.returning({ id: nodes.id });
	if (!row) throw new Error("insert failed");
	return row.id;
}

function search(query: string, extra: { type?: "text" | "task" } = {}) {
	return call(
		searchNodes,
		{ query, ...extra },
		{ context: { request: new Request("http://localhost") } },
	);
}

beforeEach(async () => {
	await db.delete(nodes);
});

describe("searchNodes", () => {
	test("ranks a node matching all query terms above one matching only one", async () => {
		await insertNode("plan the quarterly roadmap for the platform team");
		await insertNode("quarterly roadmap review with the platform team");

		const { results } = await search("quarterly platform");

		expect(results.length).toBeGreaterThanOrEqual(1);
		expect(results[0]?.snippet).toContain("quarterly");
	});

	test("ranks terms appearing close together above terms far apart (ts_rank_cd)", async () => {
		const close = await insertNode("urgent urgent task about the deadline");
		const far = await insertNode(
			"urgent task with many unrelated words in between and then deadline",
		);

		const { results } = await search("urgent deadline");
		const closeIndex = results.findIndex((r) => r.id === close);
		const farIndex = results.findIndex((r) => r.id === far);

		expect(closeIndex).toBeGreaterThanOrEqual(0);
		expect(farIndex).toBeGreaterThanOrEqual(0);
		expect(closeIndex).toBeLessThan(farIndex);
	});

	test("matches on a partial/prefix word", async () => {
		await insertNode("research elasticsearch versus postgres full text search");

		const { results, usedFallback } = await search("elastic");

		expect(usedFallback).toBe(false);
		expect(results.length).toBe(1);
		expect(results[0]?.snippet).toContain("elasticsearch");
	});

	test("falls back to trigram similarity for a typo'd query", async () => {
		await insertNode("world domination requires careful planning");

		const { results, usedFallback } = await search("domintaion");

		expect(usedFallback).toBe(true);
		expect(results.length).toBe(1);
		expect(results[0]?.snippet).toContain("domination");
	});

	test("filters by node type", async () => {
		await insertNode("buy groceries for the trip", { type: "task" });
		await insertNode("write the trip report", { type: "text" });

		const { results } = await search("trip", { type: "task" });

		expect(results.length).toBe(1);
		expect(results[0]?.type).toBe("task");
	});

	test("wraps the matched term in <mark> in the snippet", async () => {
		await insertNode("update the changelog before cutting a new release");

		const { results } = await search("changelog");

		expect(results[0]?.snippet).toContain("<mark>changelog</mark>");
	});

	test("returned ancestors match getNodeAncestors for the same node", async () => {
		const grandparent = await insertNode("grandparent node");
		const parent = await insertNode("parent node", { parentId: grandparent });
		const child = await insertNode("uniquechildtoken node", {
			parentId: parent,
		});

		const { results } = await search("uniquechildtoken");
		expect(results.length).toBe(1);
		expect(results[0]?.id).toBe(child);

		const expectedAncestors = await call(
			getNodeAncestors,
			{ id: child },
			{ context: { request: new Request("http://localhost") } },
		);
		const expectedIds = expectedAncestors.slice(0, -1).map((a) => a.id);

		expect(results[0]?.ancestors.map((a) => a.id)).toEqual(expectedIds);
	});

	test("returns no results for a query with no matches", async () => {
		await insertNode("something completely unrelated");

		const { results, usedFallback } = await search("zzzzznomatch");

		expect(results).toEqual([]);
		expect(usedFallback).toBe(true);
	});
});
