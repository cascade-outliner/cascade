import { sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
	nodePlainText,
	normalizeSearchText,
} from "@/features/nodes/model/node-search-text";
import { toNodeSlug } from "@/features/nodes/model/node-slug";
import { quickOpenSnippet } from "@/features/nodes/model/quick-open";
import { authed } from "@/orpc/context";

const RESULT_LIMIT = 50;

interface MatchRow {
	id: string;
	parent_id: string | null;
	content: unknown;
	path: string[];
}

interface AncestorRow {
	match_id: string;
	id: string;
	parent_id: string | null;
	content: unknown;
	depth: number;
}

const querySchema = z
	.string()
	.max(200)
	.transform(normalizeSearchText)
	.pipe(z.string().min(2));

export const quickOpen = authed
	.input(z.object({ query: querySchema }))
	.handler(async ({ input, context }) => {
		const userId = context.user.id;
		const matchCondition = /[\\%_]/.test(input.query)
			? sql`strpos(n.search_text, ${input.query}) > 0`
			: sql`n.search_text LIKE ${`%${input.query}%`}`;
		const matches = (await db.execute(sql`
			WITH RECURSIVE matching AS MATERIALIZED (
				SELECT n.id, n.parent_id, n.content, n."order"
				FROM nodes n
				WHERE n.user_id = ${userId}
					AND ${matchCondition}
			),
			paths AS (
				SELECT m.id AS match_id, m.parent_id, ARRAY[m."order"] AS path
				FROM matching m
				UNION ALL
				SELECT p.match_id, parent.parent_id, ARRAY[parent."order"] || p.path
				FROM paths p
				JOIN nodes parent ON parent.id = p.parent_id
				WHERE parent.user_id = ${userId}
			),
			selected AS (
				SELECT p.match_id, p.path
				FROM paths p
				WHERE p.parent_id IS NULL
				ORDER BY p.path
				LIMIT ${RESULT_LIMIT}
			)
			SELECT m.id, m.parent_id, m.content, s.path
			FROM selected s
			JOIN matching m ON m.id = s.match_id
			ORDER BY s.path
		`)) as unknown as MatchRow[];

		if (matches.length === 0) return [];

		const ancestorSeeds = sql.join(
			matches.map(
				(match) => sql`(${match.id}::text, ${match.parent_id}::text)`,
			),
			sql`, `,
		);
		const ancestors = (await db.execute(sql`
			WITH RECURSIVE seeds(match_id, parent_id) AS (
				VALUES ${ancestorSeeds}
			),
			ancestor_rows AS (
				SELECT s.match_id, n.id, n.parent_id, n.content, 1 AS depth
				FROM seeds s
				JOIN nodes n ON n.id = s.parent_id
				WHERE n.user_id = ${userId}
				UNION ALL
				SELECT a.match_id, n.id, n.parent_id, n.content, a.depth + 1
				FROM ancestor_rows a
				JOIN nodes n ON n.id = a.parent_id
				WHERE n.user_id = ${userId}
			)
			SELECT match_id, id, parent_id, content, depth
			FROM ancestor_rows
			ORDER BY match_id, depth
		`)) as unknown as AncestorRow[];
		const ancestorsByMatch = new Map<string, AncestorRow[]>();
		for (const ancestor of ancestors) {
			const grouped = ancestorsByMatch.get(ancestor.match_id) ?? [];
			grouped.push(ancestor);
			ancestorsByMatch.set(ancestor.match_id, grouped);
		}

		return matches.map((match) => {
			const nearestFirst = ancestorsByMatch.get(match.id) ?? [];
			const displayAncestors: AncestorRow[] =
				nearestFirst.length <= 3
					? [...nearestFirst].reverse()
					: [
							nearestFirst.at(-1) as AncestorRow,
							nearestFirst[1] as AncestorRow,
							nearestFirst[0] as AncestorRow,
						];

			return {
				id: match.id,
				slug: toNodeSlug(match),
				snippet: quickOpenSnippet(match.content, input.query),
				ancestors: displayAncestors.map((ancestor) => ({
					id: ancestor.id,
					text: nodePlainText(ancestor.content),
				})),
				omittedAncestorCount: Math.max(0, nearestFirst.length - 3),
			};
		});
	});
