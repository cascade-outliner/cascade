import { lexicalToPlainText } from "@cascade/outliner/lexical-content";
import type { NodeMetadataOf } from "@cascade/outliner/node-types";
import type { RecurrenceRule } from "@cascade/outliner/recurrence";
import { and, eq, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { authed } from "@/orpc/context";
import { DEFAULT_DUE_NOTIFICATION_TIME } from "../../model/due-date.schema";
import { toNodeSlug } from "../../model/node-slug";
import { nodes } from "../persistence/node-tables";

export interface DueSoonTask {
	id: string;
	slug: string;
	label: string;
	dueDate: string;
	dueTime: string;
	recurrence: RecurrenceRule | null;
}

/**
 * Nodes due in roughly the next day, for the client's real-time due-date
 * notification scheduler (see #599). Due dates aren't exclusive to task-type
 * nodes (the due-date pill/menu is available on every node type), so this
 * isn't scoped by `type` — only by having a due date at all. Also
 * deliberately not scoped by tree expansion/pagination like `visibleTree` —
 * a node the user hasn't expanded into view should still notify. The date
 * window is padded a day on each side of the server's own "today" so a due
 * date that's already "today" in the user's local timezone, but not yet (or
 * no longer) the server's, is still picked up; the client narrows to the
 * exact instant via `combineDueDateTime`.
 */
export const listDueSoon = authed.handler(async ({ context }) => {
	const userId = context.user.id;

	const rows = await db
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

	const tasks: DueSoonTask[] = rows
		.filter(
			(row) => !(row.metadata as NodeMetadataOf<"task"> | null)?.completed,
		)
		.map((row) => ({
			id: row.id,
			slug: toNodeSlug({ id: row.id, content: row.content }),
			label: lexicalToPlainText(row.content, 120),
			// Guaranteed non-null by the `isNotNull(nodes.dueDate)` filter above.
			dueDate: row.dueDate as string,
			dueTime: row.dueTime ?? DEFAULT_DUE_NOTIFICATION_TIME,
			recurrence: row.recurrence,
		}));

	return { tasks };
});
