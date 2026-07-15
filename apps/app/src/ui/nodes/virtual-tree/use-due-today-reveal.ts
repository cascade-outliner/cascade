import { todayRange } from "@cascade/outliner/due-date-bucket";
import type { VisibleNodeRow } from "@cascade/outliner/node-types";
import { expandNode } from "@cascade/outliner/visible-rows";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { client } from "@/orpc/client";
import { visibleTreeOptions } from "@/ui/nodes/virtual-tree/use-visible-tree";

interface VisibleTreeData {
	rows: VisibleNodeRow[];
	nextCursor: string[] | null;
}

/**
 * `visibleTree` only descends into expanded nodes, so a due-today match
 * inside a collapsed section never reaches the client and the filter
 * silently misses it. While the filter is active, fetch every due-today
 * match plus its ancestor chain and merge whichever rows are missing into
 * the query cache, expanding one collapsed level at a time (mirroring
 * `useVisibleTree`'s own `toggle`), without persisting expand state.
 */
export function useDueTodayReveal(rootId: string | null, active: boolean) {
	const queryClient = useQueryClient();
	const options = visibleTreeOptions(rootId);
	const revealing = useRef(false);

	useEffect(() => {
		if (!active || revealing.current) return;
		revealing.current = true;

		(async () => {
			const entries = await client.nodes.dueTodayIds(todayRange());
			const cached = queryClient.getQueryData<VisibleTreeData>(
				options.queryKey,
			);
			if (!cached) return;

			let rows = cached.rows;
			const loadedIds = new Set(rows.map((r) => r.id));
			let missing = entries.filter((e) => !loadedIds.has(e.id));

			while (missing.length > 0) {
				const parentIds = [
					...new Set(
						missing
							.filter((e) => e.parentId !== null && loadedIds.has(e.parentId))
							.map((e) => e.parentId as string),
					),
				];
				if (parentIds.length === 0) break;

				for (const parentId of parentIds) {
					const subtree = await client.nodes.visibleTree({ rootId: parentId });
					rows = expandNode(rows, parentId, subtree.rows);
					for (const r of subtree.rows) loadedIds.add(r.id);
				}
				missing = missing.filter((e) => !loadedIds.has(e.id));
			}

			queryClient.setQueryData(
				options.queryKey,
				(old: VisibleTreeData | undefined) => (old ? { ...old, rows } : old),
			);
		})().finally(() => {
			revealing.current = false;
		});
	}, [active, queryClient, options.queryKey]);
}
