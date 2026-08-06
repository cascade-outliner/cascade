import type { StatusSummary } from "@cascade/outliner/node-statuses";
import { toast } from "@cascade/ui/toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { m } from "#/paraglide/messages.js";
import { client, orpc } from "@/orpc/client";

export function existingStatusesOptions() {
	return orpc.nodes.listStatuses.queryOptions();
}

/** This user's statuses, for the status picker and the status filter. */
export function useExistingStatuses(): StatusSummary[] {
	const { data } = useQuery(existingStatusesOptions());
	return data ?? [];
}

function invalidateStatuses(
	queryClient: ReturnType<typeof useQueryClient>,
): Promise<unknown> {
	return Promise.all([
		queryClient.invalidateQueries({
			queryKey: existingStatusesOptions().queryKey,
		}),
		queryClient.invalidateQueries({ queryKey: orpc.nodes.visibleTree.key() }),
		queryClient.invalidateQueries({ queryKey: orpc.nodes.get.key() }),
	]);
}

/** Creates a status inline from the picker and resolves to it, so the caller
 * can apply it to the node straight away. */
export function useCreateStatus(): (
	name: string,
) => Promise<StatusSummary | null> {
	const queryClient = useQueryClient();
	const mutation = useMutation({
		mutationFn: (name: string) => client.nodes.createStatus({ name }),
		onSuccess: () => invalidateStatuses(queryClient),
		onError: () => toast.error(m.status_create_failed()),
	});
	return async (name: string) => {
		try {
			return await mutation.mutateAsync(name);
		} catch {
			return null;
		}
	};
}

/** Deletes a status outright; nodes in it lose it but aren't deleted. */
export function useDeleteStatus(): (id: string) => Promise<void> {
	const queryClient = useQueryClient();
	const mutation = useMutation({
		mutationFn: (id: string) => client.nodes.deleteStatus({ id }),
		onSuccess: () => invalidateStatuses(queryClient),
		onError: () => toast.error(m.status_delete_failed()),
	});
	return async (id: string) => {
		try {
			await mutation.mutateAsync(id);
		} catch {
			// Surfaced by the toast above; the picker stays usable.
		}
	};
}
