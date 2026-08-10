import { Inject, Injectable } from "@nestjs/common";
import { and, asc, eq, isNotNull, isNull, like, sql } from "drizzle-orm";
import {
	DRIZZLE,
	type DrizzleClient,
} from "../../../database/drizzle.provider";
import { nodes } from "../../../database/schema/node-tables";
import { nodeColumns } from "./node-columns";

export interface NodeAncestorRow {
	id: string;
	content: unknown;
}

export interface VisibleTreeSqlRow {
	id: string;
	parent_id: string | null;
	content: unknown;
	type: string;
	metadata: unknown;
	expanded: boolean;
	order: string;
	due_date: string | null;
	due_time: string | null;
	recurrence: unknown;
	icon: string | null;
	priority: string | null;
	status_id: string | null;
	status_name: string | null;
	status_color: string | null;
	tags: string[];
	is_board: boolean;
}

export interface DueSoonRow {
	id: string;
	content: unknown;
	metadata: unknown;
	dueDate: string | null;
	dueTime: string | null;
	recurrence: unknown;
}

export interface QuickOpenMatchRow {
	id: string;
	parent_id: string | null;
	content: unknown;
	path: string[];
}

export interface QuickOpenAncestorRow {
	match_id: string;
	id: string;
	parent_id: string | null;
	content: unknown;
	depth: number;
}

const QUICK_OPEN_RESULT_LIMIT = 50;

/**
 * Ported from apps/web-app/src/features/nodes/server/procedures/{get-node,
 * get-node-ancestors,visible-tree,list-nodes,resolve-node-slug,
 * list-due-soon,quick-open}.ts — same queries, adapted to apps/api's own
 * DrizzleClient/schema copy per MIGRATION.md's Phase 2.
 */
@Injectable()
export class NodesRepository {
	constructor(@Inject(DRIZZLE) private readonly db: DrizzleClient) {}

	async findById(id: string, userId: string) {
		const [node] = await this.db
			.select(nodeColumns(userId))
			.from(nodes)
			.where(and(eq(nodes.id, id), eq(nodes.userId, userId)))
			.limit(1);
		return node ?? null;
	}

	async findAncestors(id: string, userId: string): Promise<NodeAncestorRow[]> {
		return (await this.db.execute(sql`
			WITH RECURSIVE chain AS (
				SELECT id, parent_id, content, 0 AS depth FROM nodes
				WHERE id = ${id} AND user_id = ${userId}
				UNION ALL
				SELECT n.id, n.parent_id, n.content, c.depth + 1
				FROM nodes n JOIN chain c ON n.id = c.parent_id
				WHERE n.user_id = ${userId}
			)
			SELECT id, content FROM chain ORDER BY depth DESC
		`)) as unknown as NodeAncestorRow[];
	}

	async findVisibleTree(userId: string): Promise<VisibleTreeSqlRow[]> {
		return (await this.db.execute(sql`
			SELECT n.id, n.parent_id, n.content, n.type, n.metadata, n.expanded, n."order",
				n.due_date::text AS due_date, n.due_time, n.recurrence, n.icon, n.priority,
				n.is_board,
				s.id AS status_id, s.name AS status_name, s.color AS status_color,
				COALESCE(t.tags, '{}') AS tags
			FROM nodes n
			LEFT JOIN statuses s ON s.id = n.status_id AND s.user_id = ${userId}
			LEFT JOIN (
				SELECT nt.node_id, array_agg(tg.name ORDER BY tg.name) AS tags
				FROM node_tags nt
				JOIN tags tg ON tg.id = nt.tag_id AND tg.user_id = ${userId}
				GROUP BY nt.node_id
			) t ON t.node_id = n.id
			WHERE n.user_id = ${userId}
		`)) as unknown as VisibleTreeSqlRow[];
	}

	async findByParent(parentId: string | null, userId: string) {
		return this.db
			.select(nodeColumns(userId))
			.from(nodes)
			.where(
				and(
					eq(nodes.userId, userId),
					parentId === null
						? isNull(nodes.parentId)
						: eq(nodes.parentId, parentId),
				),
			)
			.orderBy(asc(nodes.order));
	}

	async findIdByIdAndUser(id: string, userId: string): Promise<string | null> {
		const [node] = await this.db
			.select({ id: nodes.id })
			.from(nodes)
			.where(and(eq(nodes.id, id), eq(nodes.userId, userId)))
			.limit(1);
		return node?.id ?? null;
	}

	async findByIdFirstBlock(idFirstBlock: string, userId: string) {
		return this.db
			.select({ id: nodes.id, content: nodes.content })
			.from(nodes)
			.where(and(eq(nodes.userId, userId), like(nodes.id, `${idFirstBlock}-%`)))
			.orderBy(asc(nodes.createdAt))
			.limit(20);
	}

	async findDueSoon(userId: string): Promise<DueSoonRow[]> {
		return this.db
			.select({
				id: nodes.id,
				content: nodes.content,
				metadata: nodes.metadata,
				dueDate: nodes.dueDate,
				dueTime: nodes.dueTime,
				recurrence: nodes.recurrence,
			})
			.from(nodes)
			.where(
				and(
					eq(nodes.userId, userId),
					isNotNull(nodes.dueDate),
					sql`${nodes.dueDate} BETWEEN (CURRENT_DATE - INTERVAL '1 day') AND (CURRENT_DATE + INTERVAL '2 day')`,
				),
			);
	}

	async findQuickOpenMatches(
		userId: string,
		query: string,
	): Promise<QuickOpenMatchRow[]> {
		const matchCondition = /[\\%_]/.test(query)
			? sql`strpos(n.search_text, ${query}) > 0`
			: sql`n.search_text LIKE ${`%${query}%`}`;
		return (await this.db.execute(sql`
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
				LIMIT ${QUICK_OPEN_RESULT_LIMIT}
			)
			SELECT m.id, m.parent_id, m.content, s.path
			FROM selected s
			JOIN matching m ON m.id = s.match_id
			ORDER BY s.path
		`)) as unknown as QuickOpenMatchRow[];
	}

	async findQuickOpenAncestors(
		userId: string,
		matches: { id: string; parent_id: string | null }[],
	): Promise<QuickOpenAncestorRow[]> {
		if (matches.length === 0) return [];
		const ancestorSeeds = sql.join(
			matches.map(
				(match) => sql`(${match.id}::text, ${match.parent_id}::text)`,
			),
			sql`, `,
		);
		return (await this.db.execute(sql`
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
		`)) as unknown as QuickOpenAncestorRow[];
	}
}
