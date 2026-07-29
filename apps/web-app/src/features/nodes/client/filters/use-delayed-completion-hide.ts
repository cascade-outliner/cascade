import { getCompletedTaskIds } from "@cascade/outliner/completed-task-ids";
import type { VisibleNodeRow } from "@cascade/outliner/node-types";
import { motionDurationsMs } from "@cascade/theme/motion";
import { useEffect, useRef, useState } from "react";

/** How long a just-completed task stays visible before the hide-completed filter hides it. */
export const COMPLETED_HIDE_DELAY_MS = 1200;
export const COMPLETED_EXIT_DURATION_MS = motionDurationsMs.smallExit;

interface DelayedCompletionHideState {
	pendingIds: Set<string>;
	exitingIds: Set<string>;
}

/**
 * Ids of tasks that were just checked off and are still within their grace
 * period, so the hide-completed filter shouldn't hide them yet. Gives the
 * user a moment to see the checkbox register before the row disappears.
 */
export function useDelayedCompletionHide(
	rows: VisibleNodeRow[],
	hideCompleted: boolean,
): DelayedCompletionHideState {
	const [state, setState] = useState<DelayedCompletionHideState>({
		pendingIds: new Set(),
		exitingIds: new Set(),
	});
	const timersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());
	const prevCompletedRef = useRef<Set<string> | null>(null);
	const prevRowIdsRef = useRef<Set<string> | null>(null);

	useEffect(() => {
		const timers = timersRef.current;
		const currentCompleted = getCompletedTaskIds(rows);
		const currentRowIds = new Set(rows.map((row) => row.id));
		const prevCompleted = prevCompletedRef.current;
		const prevRowIds = prevRowIdsRef.current;

		if (!hideCompleted) {
			for (const timer of timers.values()) clearTimeout(timer);
			timers.clear();
			setState((current) =>
				current.pendingIds.size > 0 || current.exitingIds.size > 0
					? { pendingIds: new Set(), exitingIds: new Set() }
					: current,
			);
		}

		if (prevCompleted !== null && prevRowIds !== null && hideCompleted) {
			for (const id of currentCompleted) {
				// Only a genuine incomplete-to-complete transition on a row that
				// was already loaded earns a grace period. A row entering `rows`
				// for the first time already completed (e.g. expanding a
				// collapsed subtree, loading more, or a due-date filter forcing
				// a fetch) was never "just checked off" and must stay hidden.
				if (!prevCompleted.has(id) && prevRowIds.has(id) && !timers.has(id)) {
					setState((current) => ({
						pendingIds: new Set(current.pendingIds).add(id),
						exitingIds: current.exitingIds,
					}));
					timers.set(
						id,
						setTimeout(() => {
							setState((current) => ({
								pendingIds: current.pendingIds,
								exitingIds: new Set(current.exitingIds).add(id),
							}));
							timers.set(
								id,
								setTimeout(() => {
									timers.delete(id);
									setState((current) => {
										const pendingIds = new Set(current.pendingIds);
										const exitingIds = new Set(current.exitingIds);
										pendingIds.delete(id);
										exitingIds.delete(id);
										return { pendingIds, exitingIds };
									});
								}, COMPLETED_EXIT_DURATION_MS),
							);
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
		setState((current) => {
			const pendingIds = new Set(current.pendingIds);
			const exitingIds = new Set(current.exitingIds);
			let changed = false;
			for (const id of current.pendingIds) {
				if (!currentCompleted.has(id)) {
					pendingIds.delete(id);
					exitingIds.delete(id);
					changed = true;
				}
			}
			return changed ? { pendingIds, exitingIds } : current;
		});

		prevCompletedRef.current = currentCompleted;
		prevRowIdsRef.current = currentRowIds;
	}, [rows, hideCompleted]);

	useEffect(() => {
		const timers = timersRef.current;
		return () => {
			for (const timer of timers.values()) clearTimeout(timer);
			timers.clear();
		};
	}, []);

	return state;
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
