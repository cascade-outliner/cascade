import type {
	StatusColor,
	StatusWithUsage,
} from "@cascade/outliner/node-statuses";
import { toast } from "@cascade/ui/toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { m } from "#/paraglide/messages.js";
import { orpc } from "@/orpc/client";

export function existingStatusesOptions(boardId: string) {
	return orpc.nodes.listStatuses.queryOptions({ input: { boardId } });
}

/** This board's statuses (visible and hidden), for the status picker/filter
 * and the settings panel. Pass `undefined` when there's no board context
 * (e.g. a node whose parent isn't a board) to skip the query entirely. */
export function useExistingStatuses(
	boardId: string | undefined,
): StatusWithUsage[] {
	const { data } = useQuery({
		...existingStatusesOptions(boardId ?? ""),
		enabled: !!boardId,
	});
	return data ?? [];
}

/** Create/rename/recolor/hide/delete for a board's statuses settings panel —
 * statuses are only managed there, never from a card's picker. */
export function useStatusManagement(boardId: string) {
	const queryClient = useQueryClient();
	const statusesQuery = useQuery(existingStatusesOptions(boardId));
	const invalidateStatuses = () =>
		Promise.all([
			queryClient.invalidateQueries({
				queryKey: existingStatusesOptions(boardId).queryKey,
			}),
			queryClient.invalidateQueries({
				queryKey: orpc.nodes.visibleTree.key(),
			}),
			queryClient.invalidateQueries({ queryKey: orpc.nodes.get.key() }),
		]);
	const createMutation = useMutation(
		orpc.nodes.createStatus.mutationOptions({
			onSuccess: async () => {
				await invalidateStatuses();
				toast.success(m.settings_statuses_create_success());
			},
			onError: () => toast.error(m.settings_statuses_create_failed()),
		}),
	);
	const updateMutation = useMutation(
		orpc.nodes.updateStatus.mutationOptions({
			onSuccess: async () => {
				await invalidateStatuses();
				toast.success(m.settings_statuses_update_success());
			},
			onError: () => toast.error(m.settings_statuses_update_failed()),
		}),
	);
	const deleteMutation = useMutation(
		orpc.nodes.deleteStatus.mutationOptions({
			onSuccess: async () => {
				await invalidateStatuses();
				toast.success(m.settings_statuses_delete_success());
			},
			onError: () => toast.error(m.settings_statuses_delete_failed()),
		}),
	);

	return {
		statusesQuery,
		createStatus: (name: string, color: StatusColor, onSuccess: () => void) =>
			createMutation.mutate({ boardId, name, color }, { onSuccess }),
		isCreatingStatus: createMutation.isPending,
		updateStatus: (
			id: string,
			changes: { name?: string; color?: StatusColor; hidden?: boolean },
			onSuccess: () => void,
		) => updateMutation.mutate({ id, boardId, ...changes }, { onSuccess }),
		updatingStatus: updateMutation.isPending
			? updateMutation.variables?.id
			: undefined,
		deleteStatus: (id: string, onSuccess: () => void) =>
			deleteMutation.mutate({ id, boardId }, { onSuccess }),
		deletingStatus: deleteMutation.isPending
			? deleteMutation.variables?.id
			: undefined,
	};
}
