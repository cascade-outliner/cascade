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
 * Keeps rows visible whose hiding is only due to a completed ancestor still
 * within its grace period, so the whole just-completed subtree stays put
 * rather than the parent lingering while its children vanish underneath it.
 */
export function revealPendingCompletions(
	hiddenIds: Set<string>,
	pendingIds: Set<string>,
	rows: VisibleNodeRow[],
): Set<string> {
	if (pendingIds.size === 0) return hiddenIds;

	const parentById = new Map(rows.map((row) => [row.id, row.parentId]));
	const isWithinPendingSubtree = (id: string): boolean => {
		let current: string | null = id;
		while (current !== null) {
			if (pendingIds.has(current)) return true;
			current = parentById.get(current) ?? null;
		}
		return false;
	};

	return new Set([...hiddenIds].filter((id) => !isWithinPendingSubtree(id)));
}
