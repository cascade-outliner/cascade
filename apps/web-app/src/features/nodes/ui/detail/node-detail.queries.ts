import { formatCalendarDate } from "@cascade/outliner/calendar-date";
import type { FlatNodeRow } from "@cascade/outliner/node-types";
import {
	nextRecurringDueDate,
	type RecurrenceInput,
} from "@cascade/outliner/recurrence";
import { toast } from "@cascade/ui/toast";
import type { QueryClient, QueryKey } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { existingTagsOptions } from "#/features/nodes/client/tags/use-existing-tags";
import { useOptimisticNodeMutation } from "#/features/nodes/client/tree/mutations/use-node-mutation";
import { visibleTreeOptions } from "#/features/nodes/client/tree/use-visible-tree";
import {
	isUuid,
	isUuidFirstBlock,
	slugifyNodeContent,
	splitNodeSlug,
} from "#/features/nodes/model/node-slug";
import { client, orpc } from "#/orpc/client";
import { m } from "#/paraglide/messages.js";
import type { NodeDetailData } from "./node-detail.types";

/**
 * Finds the node a slug refers to among already-loaded `visibleTree` rows,
 * mirroring `resolveNodeSlug`'s server-side matching (exact id, or unique
 * id-prefix + content-slug disambiguation). Returns `null` when the rows
 * aren't cached yet, or the match isn't unique — callers fall back to the
 * server procedure in that case rather than duplicating its tie-breaking.
 */
function findNodeIdInCache(
	rows: FlatNodeRow[],
	nodeSlug: string,
): string | null {
	const { slugId, slugText } = splitNodeSlug(nodeSlug);

	if (isUuid(slugId) || !isUuidFirstBlock(slugId)) {
		return rows.some((row) => row.id === slugId) ? slugId : null;
	}

	const candidates = rows.filter((row) => row.id.startsWith(`${slugId}-`));
	if (candidates.length === 1) return candidates[0].id;
	if (candidates.length === 0) return null;

	const text = slugText?.trim();
	if (!text) return null;
	const matches = candidates.filter(
		(row) => slugifyNodeContent(row.content) === text,
	);
	return matches.length === 1 ? matches[0].id : null;
}

/** Root-to-node ancestor chain (inclusive of the node itself), matching `getNodeAncestors`. */
function ancestorChainInCache(rows: FlatNodeRow[], nodeId: string) {
	const byId = new Map(rows.map((row) => [row.id, row]));
	const chain: { id: string; content: unknown }[] = [];
	let cursor = byId.get(nodeId);
	while (cursor) {
		chain.unshift({ id: cursor.id, content: cursor.content });
		cursor = cursor.parentId ? byId.get(cursor.parentId) : undefined;
	}
	return chain;
}

/**
 * Resolves the slug and warms the caches the detail page needs, reusing the
 * already-loaded `visibleTree` rows instead of hitting the network when
 * possible — the flat tree fetched on initial load already contains every
 * node the user owns, so a focused node's own record and its ancestor chain
 * are derivable client-side without a fresh `resolveSlug`/`get`/`ancestors`
 * round trip.
 */
export async function loadNodeDetail(
	queryClient: QueryClient,
	nodeSlug: string,
) {
	queryClient.prefetchQuery(existingTagsOptions());

	const tree = queryClient.getQueryData(visibleTreeOptions().queryKey);
	const nodeId = tree ? findNodeIdInCache(tree.rows, nodeSlug) : null;

	if (tree && nodeId) {
		const row = tree.rows.find((r) => r.id === nodeId);
		if (row) {
			const node: NodeDetailData = {
				...row,
				recurrence: row.recurrence ?? null,
				hasChildren: tree.rows.some((r) => r.parentId === nodeId),
			};
			queryClient.setQueryData(
				orpc.nodes.get.queryOptions({ input: { id: nodeId } }).queryKey,
				node,
			);
			queryClient.setQueryData(
				orpc.nodes.ancestors.queryOptions({ input: { id: nodeId } }).queryKey,
				ancestorChainInCache(tree.rows, nodeId),
			);
			return nodeId;
		}
	}

	// Cache miss (cold navigation, deep link, or an ambiguous slug) — fall
	// back to the network path.
	const { slugId, slugText } = splitNodeSlug(nodeSlug);
	const resolved = await queryClient.ensureQueryData(
		orpc.nodes.resolveSlug.queryOptions({ input: { slugId, slugText } }),
	);
	queryClient.prefetchQuery(visibleTreeOptions());
	await Promise.all([
		queryClient.ensureQueryData(
			orpc.nodes.get.queryOptions({ input: { id: resolved.id } }),
		),
		queryClient.ensureQueryData(
			orpc.nodes.ancestors.queryOptions({ input: { id: resolved.id } }),
		),
	]);
	return resolved.id;
}

/** The optimistic mutations available from the node detail header (task toggle, due date, tags). */
export function useNodeDetailMutations(nodeId: string, queryKey: QueryKey) {
	const queryClient = useQueryClient();

	const toggleTaskMutation = useOptimisticNodeMutation<
		boolean,
		{ advanced: boolean; nextDueDate: string | null },
		NodeDetailData
	>({
		queryKey,
		mutationFn: (completed) => {
			const current = queryClient.getQueryData<NodeDetailData>(queryKey);
			return client.nodes.setTaskCompleted({
				id: nodeId,
				completed,
				today: formatCalendarDate(new Date()),
				expectedDueDate: current?.dueDate ?? null,
			});
		},
		patch: (old, completed) =>
			old
				? {
						...old,
						...(completed && old.recurrence && old.dueDate
							? {
									dueDate: nextRecurringDueDate(
										old.dueDate,
										old.recurrence,
										formatCalendarDate(new Date()),
									),
									metadata: { completed: false },
								}
							: { metadata: { completed } }),
					}
				: old,
		onSuccess: (result) => {
			if (result.advanced && result.nextDueDate) {
				toast.success(
					m.node_recurring_completed({
						date: new Intl.DateTimeFormat(undefined, {
							month: "short",
							day: "numeric",
						}).format(new Date(`${result.nextDueDate}T00:00:00`)),
					}),
				);
			}
			queryClient.invalidateQueries({
				queryKey: orpc.nodes.visibleTree.key(),
			});
		},
	});

	const setDueDateMutation = useOptimisticNodeMutation<
		Date | null,
		void,
		NodeDetailData
	>({
		queryKey,
		mutationFn: (dueDate) =>
			client.nodes.setDueDate({
				id: nodeId,
				dueDate: dueDate ? formatCalendarDate(dueDate) : null,
			}),
		patch: (old, dueDate) =>
			old
				? {
						...old,
						dueDate: dueDate ? formatCalendarDate(dueDate) : null,
						recurrence:
							dueDate && old.recurrence
								? { ...old.recurrence, anchorDay: dueDate.getDate() }
								: null,
					}
				: old,
		onSuccess: () =>
			queryClient.invalidateQueries({
				queryKey: orpc.nodes.visibleTree.key(),
			}),
	});

	const setIconMutation = useOptimisticNodeMutation<
		string | null,
		void,
		NodeDetailData
	>({
		queryKey,
		mutationFn: (icon) => client.nodes.setIcon({ id: nodeId, icon }),
		patch: (old, icon) => (old ? { ...old, icon } : old),
		onSuccess: () =>
			queryClient.invalidateQueries({
				queryKey: orpc.nodes.visibleTree.key(),
			}),
	});

	const setTagsMutation = useOptimisticNodeMutation<
		string[],
		void,
		NodeDetailData
	>({
		queryKey,
		mutationFn: (tags) => client.nodes.setTags({ id: nodeId, tags }),
		patch: (old, tags) => (old ? { ...old, tags } : old),
		onSuccess: () =>
			queryClient.invalidateQueries({
				queryKey: existingTagsOptions().queryKey,
			}),
	});

	const setRecurrenceMutation = useOptimisticNodeMutation<
		RecurrenceInput | null,
		void,
		NodeDetailData
	>({
		queryKey,
		mutationFn: (recurrence) =>
			client.nodes.setRecurrence({ id: nodeId, recurrence }),
		patch: (old, recurrence) =>
			old
				? {
						...old,
						recurrence:
							recurrence && old.dueDate
								? {
										...recurrence,
										anchorDay: Number(old.dueDate.slice(8, 10)),
									}
								: null,
						metadata:
							recurrence && old.type === "task"
								? { completed: false }
								: old.metadata,
					}
				: old,
	});

	return {
		toggleTask: (completed: boolean) => toggleTaskMutation.mutate(completed),
		setDueDate: (dueDate: Date | null) => setDueDateMutation.mutate(dueDate),
		setRecurrence: (recurrence: RecurrenceInput | null) =>
			setRecurrenceMutation.mutate(recurrence),
		setTags: (tags: string[]) => setTagsMutation.mutate(tags),
		setIcon: (icon: string | null) => setIconMutation.mutate(icon),
	};
}
