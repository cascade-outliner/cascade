import type { CalendarDateString } from "@cascade/outliner/calendar-date";
import type { PriorityName } from "@cascade/outliner/node-priority";
import type {
	FlatNodeRow,
	NodeMetadata,
	NodeTypeName,
} from "@cascade/outliner/node-types";
import type { RecurrenceRule } from "@cascade/outliner/recurrence";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { authed } from "@/orpc/context";

interface VisibleTreeSqlRow {
	id: string;
	parent_id: string | null;
	content: unknown;
	type: NodeTypeName;
	metadata: unknown;
	expanded: boolean;
	order: string;
	due_date: CalendarDateString | null;
	due_time: string | null;
	recurrence: RecurrenceRule | null;
	icon: string | null;
	priority: PriorityName | null;
	status_id: string | null;
	status_name: string | null;
	status_color: string | null;
	tags: string[];
	is_board: boolean;
}

/**
 * Every node belonging to the current user, flat and unordered. The client
 * builds the tree from `parentId` and computes depth-first visible order,
 * filtering, and collapse-gating itself (see `buildVisibleTree` and
 * `getRowVisibility`) — the server no longer paginates, scopes to a
 * subtree, or filters by due date/completion.
 */
export const visibleTree = authed.handler(async ({ context }) => {
	const userId = context.user.id;

	const result = (await db.execute(sql`
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

	const rows: FlatNodeRow[] = result.map((r) => ({
		id: r.id,
		parentId: r.parent_id,
		content: r.content,
		type: r.type,
		metadata: r.metadata as NodeMetadata,
		expanded: r.expanded,
		order: r.order,
		dueDate: r.due_date,
		dueTime: r.due_time,
		recurrence: r.recurrence,
		icon: r.icon,
		priority: r.priority,
		status:
			r.status_id && r.status_name
				? {
						id: r.status_id,
						name: r.status_name,
						color: r.status_color ?? "sky",
					}
				: null,
		tags: r.tags,
		isBoard: r.is_board,
	}));

	return { rows };
});
