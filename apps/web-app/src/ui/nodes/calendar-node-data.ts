import { formatCalendarDate } from "@cascade/outliner/calendar-date";
import type { CalendarNodeProps } from "@cascade/outliner/calendar-node";
import type { TypedMetadata } from "@cascade/outliner/node-types";
import { toast } from "@cascade/ui/toast";
import { useQueryClient } from "@tanstack/react-query";
import { m } from "#/paraglide/messages.js";
import { client, orpc } from "@/orpc/client";
import { existingTagsOptions } from "@/ui/nodes/use-existing-tags";
import { undoStore } from "@/ui/undo/undo-store";

/** The Calendar entry's data loaders and node mutations, wired to the real
 * `calendar.*`/`nodes.*` oRPC procedures. Unlike the main tree's mutations
 * (see `virtual-tree/data/mutations`), these don't patch a shared
 * `visibleTree` query cache: a due node can live anywhere in the outline,
 * not just wherever is currently loaded, so each edit just persists and
 * broadly invalidates instead of doing a precise optimistic patch. Content/
 * type/tags/due-date changes still get undo/redo, using the pre-mutation
 * value `CalendarNode` already has in hand (it renders the row). Duplicate
 * and delete don't — `useDuplicateMutation`/`useRemoveMutation` support it
 * for the real tree by reading a full subtree snapshot out of that tree's
 * cache first, which isn't available here.
 */
export function useCalendarNodeData(): Omit<
	CalendarNodeProps,
	| "renderNodeLink"
	| "indentSize"
	| "existingTags"
	| "onDeleteTag"
	| "onTagClick"
> {
	const queryClient = useQueryClient();

	function invalidateTree() {
		return queryClient.invalidateQueries({
			queryKey: orpc.nodes.visibleTree.key(),
		});
	}

	const rawSaveContent = (id: string, content: { root: unknown } | null) =>
		client.nodes.updateContent({ id, content }).then(invalidateTree);

	const rawSetType = (id: string, typed: TypedMetadata) =>
		client.nodes.setType({ id, ...typed }).then(invalidateTree);

	// The calendar's own year/month/day/day-node lists are plain one-off
	// loads (see calendar-node.tsx), not a TanStack Query cache, so a due-
	// date change has nothing further to invalidate here — CalendarNode
	// already drops the node from its current day's list optimistically.
	const rawSetDueDate = (id: string, dueDate: string | null) =>
		client.nodes.setDueDate({ id, dueDate }).then(invalidateTree);

	const rawSetTags = (id: string, tags: string[]) =>
		client.nodes.setTags({ id, tags }).then(() => {
			invalidateTree();
			queryClient.invalidateQueries({
				queryKey: existingTagsOptions().queryKey,
			});
		});

	return {
		loadYears: () => client.calendar.years(),
		loadMonths: (year: number) => client.calendar.months({ year }),
		loadDays: (year: number, month: number) =>
			client.calendar.days({ year, month }),
		loadDayNodes: (date) => client.calendar.dayNodes({ date }),

		onSaveContent: (id, content, previousContent) => {
			rawSaveContent(id, content);
			undoStore.push({
				undo: () => rawSaveContent(id, previousContent),
				redo: () => rawSaveContent(id, content),
			});
		},
		onSetType: (id, typed, previous) => {
			rawSetType(id, typed);
			undoStore.push({
				undo: () => rawSetType(id, previous),
				redo: () => rawSetType(id, typed),
			});
		},
		onSetDueDate: (id, date, previousDate) => {
			const nextDate = date ? formatCalendarDate(date) : null;
			rawSetDueDate(id, nextDate);
			undoStore.push({
				undo: () => rawSetDueDate(id, previousDate),
				redo: () => rawSetDueDate(id, nextDate),
			});
		},
		onSetTags: (id, tags, previousTags) => {
			rawSetTags(id, tags);
			undoStore.push({
				undo: () => rawSetTags(id, previousTags),
				redo: () => rawSetTags(id, tags),
			});
		},
		onDuplicate: (id) => {
			const run = client.nodes.duplicate({ id }).then(invalidateTree);
			toast
				.promise(run, {
					loading: m.node_duplicating(),
					success: m.node_duplicated(),
					error: m.node_duplicate_failed(),
				})
				.catch(() => {
					// Already surfaced by the error toast above.
				});
		},
		onDelete: (id) => {
			client.nodes.delete({ id }).then(invalidateTree);
		},
	};
}
