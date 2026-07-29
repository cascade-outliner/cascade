import type { CalendarDateString } from "@cascade/outliner/calendar-date";
import type {
	NodeMetadata,
	NodeTypeName,
	VisibleNodeRow,
} from "@cascade/outliner/node-types";
import type { RecurrenceRule } from "@cascade/outliner/recurrence";
import { sql } from "drizzle-orm";
import { db } from "@/db";

interface SharedSubtreeSqlRow {
	id: string;
	parent_id: string | null;
	content: unknown;
	type: NodeTypeName;
	metadata: unknown;
	expanded: boolean;
	order: string;
	due_date: CalendarDateString | null;
	recurrence: RecurrenceRule | null;
	depth: number;
	path: string[];
	has_children: boolean;
	is_last_child: boolean;
	tags: string[];
}

/**
 * Flat, depth-first list of a shared node and every descendant, scoped by the
 * tree *owner's* id rather than the viewing session — the trust boundary for
 * a share is the token, already checked by the caller, not who's logged in.
 * Mirrors `visibleTree`'s recursive CTE, but anchored on a single node (the
 * share's root) instead of "top-level roots", and always walks every
 * descendant regardless of `expanded` since there's no owner UI state to
 * respect for a read-only viewer.
 */
export async function fetchSharedSubtree({
	ownerId,
	rootId,
	cursor,
	limit,
}: {
	ownerId: string;
	rootId: string;
	cursor: string[] | null;
	limit: number;
}): Promise<{ rows: VisibleNodeRow[]; nextCursor: string[] | null }> {
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
			SELECT n.id, n.parent_id, n.content, n.type, n.metadata, n.expanded, n."order", n.due_date, n.recurrence,
				0 AS depth,
				ARRAY[n."order"] AS path
			FROM nodes n, params
			WHERE n.user_id = ${ownerId}
				AND n.id = ${rootId}
				AND (params.cursor IS NULL OR ARRAY[n."order"] >= params.cursor[1:1])
			UNION ALL
			SELECT c.id, c.parent_id, c.content, c.type, c.metadata, c.expanded, c."order", c.due_date, c.recurrence,
				v.depth + 1,
				v.path || c."order"
			FROM nodes c
			JOIN visible v ON c.parent_id = v.id
			CROSS JOIN params
			WHERE c.user_id = ${ownerId}
				AND (
					params.cursor IS NULL
					OR (v.path || c."order") >= params.cursor[1:array_length(v.path, 1) + 1]
				)
			),
			page AS MATERIALIZED (
				SELECT v.id, v.parent_id, v.content, v.type, v.metadata, v.expanded, v."order", v.due_date, v.recurrence, v.depth, v.path,
					(lead(v.id) OVER (PARTITION BY v.parent_id ORDER BY v."order")) IS NULL AS is_last_child
				FROM visible v
				${cursor ? sql`WHERE v.path > (SELECT cursor FROM params)` : sql``}
				ORDER BY v.path
				LIMIT ${limit + 1}
			)
		SELECT p.id, p.parent_id, p.content, p.type, p.metadata, p.expanded, p."order", p.due_date::text AS due_date, p.recurrence, p.depth, p.path, p.is_last_child,
			COALESCE(hc.has_children, false) AS has_children,
			COALESCE(t.tags, '{}') AS tags
		FROM page p
		LEFT JOIN (
			SELECT n.parent_id, true AS has_children
			FROM nodes n
			WHERE n.user_id = ${ownerId} AND n.parent_id IN (SELECT id FROM page)
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
	`)) as unknown as SharedSubtreeSqlRow[];

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
		recurrence: r.recurrence,
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
}
