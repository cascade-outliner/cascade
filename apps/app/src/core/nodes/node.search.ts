import { sql } from "drizzle-orm";
import { z } from "zod";
import { type NodeTypeName, nodeTypeNames } from "@/core/nodes/node-types";
import { db } from "@/db";
import { base } from "@/orpc/context";
import { lexicalToPlainText } from "@/ui/lexical/lexical-content";

/**
 * Builds a prefix tsquery from live, possibly-incomplete input: each token
 * becomes a `term:*` prefix match, AND'd together. `websearch_to_tsquery`
 * can't express the `:*` prefix operator needed for type-ahead search, so the
 * query is built by hand instead.
 */
function toPrefixTsQueryInput(raw: string): string {
	return raw
		.trim()
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 8) // bound query cost for pathological input
		.map((w) => w.replace(/[^\p{L}\p{N}]/gu, ""))
		.filter(Boolean)
		.map((w) => `${w}:*`)
		.join(" & ");
}

interface SearchRow {
	id: string;
	type: NodeTypeName;
	rank: number;
	snippet: string;
}

interface AncestorRow {
	result_id: string;
	id: string;
	content: unknown;
}

export const searchNodes = base
	.input(
		z.object({
			query: z.string().min(1).max(200),
			type: z.enum(nodeTypeNames).optional(),
			limit: z.number().int().min(1).max(50).default(20),
		}),
	)
	.handler(async ({ input }) => {
		const tsqueryInput = toPrefixTsQueryInput(input.query);
		if (!tsqueryInput) return { results: [], usedFallback: false };

		const typeFilter = input.type ? sql`AND n.type = ${input.type}` : sql``;

		let rows = (await db.execute(sql`
			SELECT n.id, n.type,
				ts_rank_cd(n.search_vector, q.query) AS rank,
				ts_headline('english', n.search_text, q.query,
					'MaxFragments=1, MaxWords=20, MinWords=5, StartSel=<mark>, StopSel=</mark>'
				) AS snippet
			FROM nodes n, to_tsquery('english', ${tsqueryInput}) AS q(query)
			WHERE n.search_vector @@ q.query
			${typeFilter}
			ORDER BY rank DESC, n.updated_at DESC
			LIMIT ${input.limit}
		`)) as unknown as SearchRow[];

		let usedFallback = false;
		if (rows.length === 0) {
			usedFallback = true;
			// word_similarity (rather than plain similarity/`%`) compares the query
			// against the best-matching word-length span inside search_text, not
			// the whole sentence — plain similarity() dilutes a short typo'd query
			// against a long sentence and misses obvious matches. The threshold is
			// lowered per-transaction (default 0.6 is too strict for real typos)
			// while still going through the `<%` operator so the GIN trigram index
			// gets used instead of a sequential scan.
			rows = await db.transaction(async (tx) => {
				await tx.execute(
					sql`SET LOCAL pg_trgm.word_similarity_threshold = 0.3`,
				);
				return (await tx.execute(sql`
					SELECT n.id, n.type,
						word_similarity(${input.query}, n.search_text) AS rank,
						n.search_text AS snippet
					FROM nodes n
					WHERE ${input.query} <% n.search_text
					${typeFilter}
					ORDER BY rank DESC, n.updated_at DESC
					LIMIT ${input.limit}
				`)) as unknown as SearchRow[];
			});
		}

		if (rows.length === 0) return { results: [], usedFallback };

		// Batched ancestor lookup for breadcrumb context — one extra query for
		// all results together, not one per row. Built via sql.join rather than
		// interpolating the array directly: drizzle renders `${array}` as an
		// extra parenthesized tuple (e.g. `IN (($1, $2))`), which Postgres parses
		// as a row constructor and rejects — sql.join produces a flat `$1, $2`.
		const ids = rows.map((r) => r.id);
		const idList = sql.join(
			ids.map((id) => sql`${id}`),
			sql.raw(", "),
		);
		const chains = (await db.execute(sql`
			WITH RECURSIVE chain AS (
				SELECT id, parent_id, content, id AS result_id, 0 AS depth
				FROM nodes WHERE id IN (${idList})
				UNION ALL
				SELECT n.id, n.parent_id, n.content, c.result_id, c.depth + 1
				FROM nodes n JOIN chain c ON n.id = c.parent_id
				WHERE c.depth < 64
			)
			SELECT result_id, id, content FROM chain WHERE id != result_id ORDER BY result_id, depth DESC
		`)) as unknown as AncestorRow[];

		const ancestorsByResult = new Map<
			string,
			{ id: string; label: string }[]
		>();
		for (const c of chains) {
			const list = ancestorsByResult.get(c.result_id) ?? [];
			list.push({
				id: c.id,
				label: lexicalToPlainText(c.content) || "Untitled",
			});
			ancestorsByResult.set(c.result_id, list);
		}

		return {
			results: rows.map((r) => ({
				id: r.id,
				type: r.type,
				rank: r.rank,
				snippet: r.snippet,
				ancestors: ancestorsByResult.get(r.id) ?? [],
			})),
			usedFallback,
		};
	});
