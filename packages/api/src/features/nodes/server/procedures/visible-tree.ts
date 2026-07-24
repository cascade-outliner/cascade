import type { CalendarDateString } from "@cascade/outliner/calendar-date";
import type {
	NodeMetadata,
	NodeTypeName,
	VisibleNodeRow,
} from "@cascade/outliner/node-types";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../../../db";
import { authed } from "../../../../orpc/context";
import { dueDateSchema } from "../../model/due-date.schema";

interface VisibleTreeSqlRow {
	id: string;
	parent_id: string | null;
	content: unknown;
	type: NodeTypeName;
	metadata: unknown;
	expanded: boolean;
	order: string;
	due_date: CalendarDateString | null;
	depth: number;
	path: string[];
	has_children: boolean;
	is_last_child: boolean;
	tags: string[];
}

/**
 * Flat, depth-first list of every visible node (roots plus descendants of
 * expanded nodes), computed server-side in one recursive CTE. DFS order comes
 * from comparing fractional-index path arrays, which requires the `order`
 * column to use COLLATE "C" (byte-order comparison).
 */
export const visibleTree = authed
	.input(
		z
			.object({
				rootId: z.string().nullable(),
				cursor: z.array(z.string()).nullable().default(null),
				includeCollapsedDescendants: z.boolean().default(false),
				dueDateStart: dueDateSchema.optional(),
				dueDateEnd: dueDateSchema.optional(),
				limit: z.number().int().min(1).max(2000).default(500),
			})
			.refine(
				(input) =>
					(input.dueDateStart === undefined) ===
					(input.dueDateEnd === undefined),
				{ message: "Both due-date bounds are required" },
			),
	)
	.handler(async ({ input, context }) => {
		const {
			rootId,
			cursor,
			includeCollapsedDescendants,
			dueDateStart,
			dueDateEnd,
			limit,
		} = input;
		const userId = context.user.id;
		const cursorArray = cursor
			? sql`ARRAY[${sql.join(
					cursor.map((value) => sql`${value}`),
					sql`, `,
				)}]::text[]`
			: sql`NULL::text[]`;

		const result = (await db.execute(sql`
			WITH RECURSIVE params AS (
				SELECT ${cursorArray} AS cursor
				),
				visible AS (
				SELECT n.id, n.parent_id, n.content, n.type, n.metadata, n.expanded, n."order", n.due_date,
					0 AS depth,
					ARRAY[n."order"] AS path
				FROM nodes n, params
				WHERE n.user_id = ${userId}
					AND ${rootId === null ? sql`n.parent_id IS NULL` : sql`n.parent_id = ${rootId}`}
					AND (params.cursor IS NULL OR ARRAY[n."order"] >= params.cursor[1:1])
				UNION ALL
				SELECT c.id, c.parent_id, c.content, c.type, c.metadata, c.expanded, c."order", c.due_date,
					v.depth + 1,
					v.path || c."order"
				FROM nodes c
				JOIN visible v ON c.parent_id = v.id
				CROSS JOIN params
				WHERE c.user_id = ${userId}
					AND (${includeCollapsedDescendants} = true OR v.expanded = true)
					AND (
						params.cursor IS NULL
						OR (v.path || c."order") >= params.cursor[1:array_length(v.path, 1) + 1]
					)
				),
				matching_paths AS MATERIALIZED (
					SELECT v.path
					FROM visible v
					${dueDateStart && dueDateEnd ? sql`WHERE v.due_date BETWEEN ${dueDateStart}::date AND ${dueDateEnd}::date` : sql``}
				),
				filtered AS (
					SELECT v.*
					FROM visible v
					${
						dueDateStart && dueDateEnd
							? sql`WHERE EXISTS (
								SELECT 1
								FROM matching_paths m
								WHERE m.path[1:cardinality(v.path)] = v.path
							)`
							: sql``
					}
				),
				page AS MATERIALIZED (
					SELECT v.id, v.parent_id, v.content, v.type, v.metadata, v.expanded, v."order", v.due_date, v.depth, v.path,
						(lead(v.id) OVER (PARTITION BY v.parent_id ORDER BY v."order")) IS NULL AS is_last_child
					FROM filtered v
					${cursor ? sql`WHERE v.path > (SELECT cursor FROM params)` : sql``}
					ORDER BY v.path
					LIMIT ${limit + 1}
				)
			SELECT p.id, p.parent_id, p.content, p.type, p.metadata, p.expanded, p."order", p.due_date::text AS due_date, p.depth, p.path, p.is_last_child,
				COALESCE(hc.has_children, false) AS has_children,
				COALESCE(t.tags, '{}') AS tags
			FROM page p
			LEFT JOIN (
				SELECT n.parent_id, true AS has_children
				FROM nodes n
				WHERE n.user_id = ${userId} AND n.parent_id IN (SELECT id FROM page)
				GROUP BY n.parent_id
			) hc ON hc.parent_id = p.id
			LEFT JOIN (
				SELECT nt.node_id, array_agg(tg.name ORDER BY tg.name) AS tags
				FROM node_tags nt
				JOIN tags tg ON tg.id = nt.tag_id
				WHERE nt.node_id IN (SELECT id FROM page)
				GROUP BY nt.node_id
			) t ON t.node_id = p.id
			ORDER BY p.path
		`)) as unknown as VisibleTreeSqlRow[];

		const page = result.slice(0, limit);
		const rows: VisibleNodeRow[] = page.map((r) => ({
			id: r.id,
			parentId: r.parent_id,
			content: r.content,
			type: r.type,
			metadata: r.metadata as NodeMetadata,
			expanded: r.expanded,
			order: r.order,
			dueDate: r.due_date,
			tags: r.tags,
			depth: Number(r.depth),
			path: r.path,
			hasChildren: r.has_children,
			isLastChild: r.is_last_child,
		}));

		return {
			rows,
			nextCursor:
				result.length > limit ? (rows[rows.length - 1]?.path ?? null) : null,
		};
	});
