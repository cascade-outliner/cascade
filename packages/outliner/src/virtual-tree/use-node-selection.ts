import { useCallback, useEffect, useRef, useState } from "react";
import type { VisibleNodeRow } from "../node-types";

export interface NodeSelection {
	selectedIds: Set<string>;
	/** Toggle one id in/out of the selection (ctrl/cmd+click); becomes the range anchor. */
	toggle: (id: string) => void;
	/** Select every row between the last anchor and `id`, in current flat order (shift+click). */
	selectRange: (id: string) => void;
	/** Replace the whole selection, e.g. with the ids a marquee drag currently covers. */
	replace: (ids: string[]) => void;
	clear: () => void;
}

/**
 * Multi-select state for the flat visible-rows list: a plain id set plus an
 * anchor (the last id a non-extending selection touched) that shift-click
 * range-selects against. Pruned whenever a selected id drops out of `rows`
 * (deleted, collapsed away, filtered out) so a stale id can never outlive
 * the row it pointed to.
 */
export function useNodeSelection(rows: VisibleNodeRow[]): NodeSelection {
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
	const anchorRef = useRef<string | null>(null);

	useEffect(() => {
		setSelectedIds((current) => {
			if (current.size === 0) return current;
			const rowIds = new Set(rows.map((r) => r.id));
			const pruned = new Set([...current].filter((id) => rowIds.has(id)));
			return pruned.size === current.size ? current : pruned;
		});
	}, [rows]);

	const toggle = useCallback((id: string) => {
		anchorRef.current = id;
		setSelectedIds((current) => {
			const next = new Set(current);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	}, []);

	const selectRange = useCallback(
		(id: string) => {
			const anchor = anchorRef.current;
			if (anchor === null) {
				toggle(id);
				return;
			}
			const anchorIndex = rows.findIndex((r) => r.id === anchor);
			const targetIndex = rows.findIndex((r) => r.id === id);
			if (anchorIndex === -1 || targetIndex === -1) {
				toggle(id);
				return;
			}
			const [start, end] =
				anchorIndex < targetIndex
					? [anchorIndex, targetIndex]
					: [targetIndex, anchorIndex];
			setSelectedIds(new Set(rows.slice(start, end + 1).map((r) => r.id)));
		},
		[rows, toggle],
	);

	const replace = useCallback((ids: string[]) => {
		setSelectedIds(new Set(ids));
	}, []);

	const clear = useCallback(() => {
		anchorRef.current = null;
		setSelectedIds((current) => (current.size === 0 ? current : new Set()));
	}, []);

	return { selectedIds, toggle, selectRange, replace, clear };
}

/** Clears the selection on Escape, while any selection is active. Attached
 * to `window` (not the tree container) so it fires regardless of what
 * currently has focus; a popover/dialog that handles Escape itself stops
 * the event before it gets here, so this never fights an open menu. */
export function useEscapeClearsSelection(active: boolean, onClear: () => void) {
	useEffect(() => {
		if (!active) return;
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClear();
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [active, onClear]);
}
