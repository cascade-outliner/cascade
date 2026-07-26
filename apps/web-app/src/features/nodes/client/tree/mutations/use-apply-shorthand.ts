import { formatCalendarDate } from "@cascade/outliner/calendar-date";
import { normalizeTags } from "@cascade/outliner/node-tags";
import { patchRow } from "@cascade/outliner/visible-rows";
import { toast } from "@cascade/ui/toast";
import type { QueryKey } from "@tanstack/react-query";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { m } from "#/paraglide/messages.js";
import { existingTagsOptions } from "@/features/nodes/client/tags/use-existing-tags";
import { undoStore } from "@/features/nodes/client/undo/undo-store";
import { client, orpc } from "@/orpc/client";
import { patchRows } from "../cache-helpers";
import type { VisibleTreeData } from "../tree-data.types";

interface NodeState {
	content: { root: unknown } | null;
	tags: string[];
	dueDate: string | null;
}

const nodeQueues = new Map<string, Promise<unknown>>();

function enqueue<T>(id: string, action: () => Promise<T>): Promise<T> {
	const previous = nodeQueues.get(id) ?? Promise.resolve();
	const next = previous.catch(() => undefined).then(action);
	let tracked: Promise<unknown>;
	const cleanup = () => {
		if (nodeQueues.get(id) === tracked) nodeQueues.delete(id);
	};
	tracked = next.then(cleanup, cleanup);
	nodeQueues.set(id, tracked);
	return next;
}

export function useApplyShorthandMutation(queryKey: QueryKey) {
	const queryClient = useQueryClient();
	const mutation = useMutation({
		mutationFn: (vars: Parameters<typeof client.nodes.applyShorthand>[0]) =>
			client.nodes.applyShorthand(vars),
		onSuccess: (result, vars) => {
			queryClient.setQueryData<VisibleTreeData>(queryKey, (old) =>
				patchRows(
					(rows) =>
						patchRow(rows, vars.id, {
							content: result.content,
							tags: result.tags,
							dueDate: result.dueDate,
						}),
					old,
				),
			);
			queryClient.invalidateQueries({
				queryKey: existingTagsOptions().queryKey,
			});
			queryClient.invalidateQueries({ queryKey: orpc.nodes.ancestors.key() });
		},
	});

	const rawRestore = (id: string, state: NodeState) =>
		enqueue(id, () =>
			mutation.mutateAsync({
				operation: "restore",
				id,
				...state,
			}),
		);

	return async (
		id: string,
		application: {
			content: { root: unknown };
			tags: string[];
			dueDate?: Date;
		},
	) => {
		const row = queryClient
			.getQueryData<VisibleTreeData>(queryKey)
			?.rows.find((candidate) => candidate.id === id);
		if (!row) throw new Error("Node not found in visible tree");
		const before: NodeState = {
			content: row.content as { root: unknown } | null,
			tags: row.tags,
			dueDate: row.dueDate,
		};
		const canonicalExisting = new Map(
			row.tags.map((tag) => [tag.toLowerCase(), tag]),
		);
		const optimisticTags = normalizeTags([
			...row.tags,
			...application.tags.map(
				(tag) => canonicalExisting.get(tag.toLowerCase()) ?? tag,
			),
		]);
		const after: NodeState = {
			content: application.content,
			tags: optimisticTags,
			dueDate:
				application.dueDate === undefined
					? row.dueDate
					: formatCalendarDate(application.dueDate),
		};
		queryClient.setQueryData<VisibleTreeData>(queryKey, (old) =>
			patchRows((rows) => patchRow(rows, id, after), old),
		);

		try {
			const result = await enqueue(id, () =>
				mutation.mutateAsync({
					operation: "apply",
					id,
					content: application.content,
					addedTags: application.tags,
					...(application.dueDate
						? { dueDate: formatCalendarDate(application.dueDate) }
						: {}),
				}),
			);
			const authoritativeAfter: NodeState = result;
			undoStore.push({
				undo: async () => {
					await rawRestore(id, before);
				},
				redo: async () => {
					await rawRestore(id, authoritativeAfter);
				},
			});
		} catch (error) {
			queryClient.setQueryData<VisibleTreeData>(queryKey, (old) =>
				patchRows((rows) => patchRow(rows, id, before), old),
			);
			toast.error(m.node_shorthand_failed());
			throw error;
		}
	};
}
