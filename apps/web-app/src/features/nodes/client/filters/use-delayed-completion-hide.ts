import { getCompletedTaskIds } from "@cascade/outliner/completed-task-ids";
import type { VisibleNodeRow } from "@cascade/outliner/node-types";
import { useEffect, useRef, useState } from "react";

/** How long a just-completed task stays visible before the hide-completed filter hides it. */
export const COMPLETED_HIDE_DELAY_MS = 1200;

/**
 * Ids of tasks that were just checked off and are still within their grace
 * period, so the hide-completed filter shouldn't hide them yet. Gives the
 * user a moment to see the checkbox register before the row disappears.
 */
export function useDelayedCompletionHide(
	rows: VisibleNodeRow[],
	hideCompleted: boolean,
): Set<string> {
	const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
	const timersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());
	const prevCompletedRef = useRef<Set<string> | null>(null);

	useEffect(() => {
		const timers = timersRef.current;
		const currentCompleted = getCompletedTaskIds(rows);
		const prevCompleted = prevCompletedRef.current;

		if (prevCompleted !== null && hideCompleted) {
			for (const id of currentCompleted) {
				if (!prevCompleted.has(id) && !timers.has(id)) {
					setPendingIds((ids) => new Set(ids).add(id));
					timers.set(
						id,
						setTimeout(() => {
							timers.delete(id);
							setPendingIds((ids) => {
								if (!ids.has(id)) return ids;
								const next = new Set(ids);
								next.delete(id);
								return next;
							});
						}, COMPLETED_HIDE_DELAY_MS),
					);
				}
			}
		}

		for (const [id, timer] of timers) {
			if (!currentCompleted.has(id)) {
				clearTimeout(timer);
				timers.delete(id);
			}
		}
		setPendingIds((ids) => {
			let changed = false;
			const next = new Set(ids);
			for (const id of ids) {
				if (!currentCompleted.has(id)) {
					next.delete(id);
					changed = true;
				}
			}
			return changed ? next : ids;
		});

		prevCompletedRef.current = currentCompleted;
	}, [rows, hideCompleted]);

	useEffect(() => {
		const timers = timersRef.current;
		return () => {
			for (const timer of timers.values()) clearTimeout(timer);
			timers.clear();
		};
	}, []);

	return pendingIds;
}

/**
 * Rewrites rows so pending (just-checked, still in their grace period) tasks
 * look not-yet-completed, for feeding into `getRowVisibility`. This reveals
 * exactly what the pending completion would otherwise hide — the task and
 * any descendants that aren't hidden for some other, unrelated reason (e.g.
 * a grandchild that was already checked off and hidden before this task was
 * ever touched stays hidden, even though it's in the same subtree).
 */
export function withPendingTasksIncomplete(
	rows: VisibleNodeRow[],
	pendingIds: Set<string>,
): VisibleNodeRow[] {
	if (pendingIds.size === 0) return rows;

	return rows.map((row) =>
		pendingIds.has(row.id) && row.type === "task" && row.metadata?.completed
			? { ...row, metadata: { ...row.metadata, completed: false } }
			: row,
	);
}
