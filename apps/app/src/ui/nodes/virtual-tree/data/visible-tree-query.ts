import { formatCalendarDate } from "@cascade/outliner/calendar-date";
import type { DueDateRange } from "@cascade/outliner/node-filters";
import { orpc } from "@/orpc/client";

export function visibleTreeOptions(
	rootId: string | null,
	includeCollapsedDescendants = false,
	dueDateRange: DueDateRange | null = null,
) {
	return orpc.nodes.visibleTree.queryOptions({
		input: {
			rootId,
			includeCollapsedDescendants,
			...(dueDateRange
				? {
						dueDateStart: formatCalendarDate(dueDateRange.start),
						dueDateEnd: formatCalendarDate(dueDateRange.end),
					}
				: {}),
		},
	});
}
