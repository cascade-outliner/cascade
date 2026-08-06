import type {
	StatusColor,
	StatusWithUsage,
} from "@cascade/outliner/node-statuses";
import { toast } from "@cascade/ui/toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { m } from "#/paraglide/messages.js";
import { orpc } from "@/orpc/client";

export function existingStatusesOptions() {
	return orpc.nodes.listStatuses.queryOptions();
}

/** This user's statuses, for the status picker and the status filter. */
export function useExistingStatuses(): StatusWithUsage[] {
	const { data } = useQuery(existingStatusesOptions());
	return data ?? [];
}

/** Create/rename/recolor/delete for the statuses settings panel — statuses
 * are only managed there, never from a row's picker. */
export function useStatusManagement() {
	const queryClient = useQueryClient();
	const statusesQuery = useQuery(existingStatusesOptions());
	const invalidateStatuses = () =>
		Promise.all([
			queryClient.invalidateQueries({
				queryKey: existingStatusesOptions().queryKey,
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
			createMutation.mutate({ name, color }, { onSuccess }),
		isCreatingStatus: createMutation.isPending,
		updateStatus: (
			id: string,
			changes: { name?: string; color?: StatusColor },
			onSuccess: () => void,
		) => updateMutation.mutate({ id, ...changes }, { onSuccess }),
		updatingStatus: updateMutation.isPending
			? updateMutation.variables?.id
			: undefined,
		deleteStatus: (id: string, onSuccess: () => void) =>
			deleteMutation.mutate({ id }, { onSuccess }),
		deletingStatus: deleteMutation.isPending
			? deleteMutation.variables?.id
			: undefined,
	};
}
