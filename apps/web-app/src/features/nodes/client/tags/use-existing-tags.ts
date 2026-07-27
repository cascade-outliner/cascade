import type { TagSummary } from "@cascade/outliner/node-tags";
import { toast } from "@cascade/ui/toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { m } from "#/paraglide/messages.js";
import { client, orpc } from "@/orpc/client";

export function existingTagsOptions() {
	return orpc.nodes.listTags.queryOptions();
}

/** This user's tags with usage counts, for the tag editor's checklist. */
export function useExistingTags(): TagSummary[] {
	const { data } = useQuery(existingTagsOptions());
	return data ?? [];
}

/** Deletes a tag outright (every node that has it loses it), then refreshes
 * the tag list and any currently-loaded trees/nodes. */
export function useDeleteTag(): (name: string) => Promise<void> {
	const queryClient = useQueryClient();
	const mutation = useMutation({
		mutationFn: (name: string) => client.nodes.deleteTag({ name }),
		onSuccess: () =>
			Promise.all([
				queryClient.invalidateQueries({
					queryKey: existingTagsOptions().queryKey,
				}),
				queryClient.invalidateQueries({
					queryKey: orpc.nodes.visibleTree.key(),
				}),
				queryClient.invalidateQueries({ queryKey: orpc.nodes.get.key() }),
			]),
	});
	return (name: string) => mutation.mutateAsync(name);
}

export function useTagManagement() {
	const queryClient = useQueryClient();
	const tagsQuery = useQuery(existingTagsOptions());
	const invalidateTags = () =>
		Promise.all([
			queryClient.invalidateQueries({
				queryKey: existingTagsOptions().queryKey,
			}),
			queryClient.invalidateQueries({
				queryKey: orpc.nodes.visibleTree.key(),
			}),
			queryClient.invalidateQueries({ queryKey: orpc.nodes.get.key() }),
		]);
	const createMutation = useMutation(
		orpc.nodes.createTag.mutationOptions({
			onSuccess: async () => {
				await invalidateTags();
				toast.success(m.settings_tags_create_success());
			},
			onError: () => toast.error(m.settings_tags_create_failed()),
		}),
	);
	const renameMutation = useMutation(
		orpc.nodes.renameTag.mutationOptions({
			onSuccess: async () => {
				await invalidateTags();
				toast.success(m.settings_tags_rename_success());
			},
			onError: () => toast.error(m.settings_tags_rename_failed()),
		}),
	);
	const deleteMutation = useMutation(
		orpc.nodes.deleteTag.mutationOptions({
			onSuccess: async () => {
				await invalidateTags();
				toast.success(m.settings_tags_delete_success());
			},
			onError: () => toast.error(m.settings_tags_delete_failed()),
		}),
	);

	return {
		tagsQuery,
		createTag: (name: string, onSuccess: () => void) =>
			createMutation.mutate({ name }, { onSuccess }),
		isCreatingTag: createMutation.isPending,
		renameTag: (name: string, newName: string, onSuccess: () => void) =>
			renameMutation.mutate({ name, newName }, { onSuccess }),
		renamingTag: renameMutation.isPending
			? renameMutation.variables?.name
			: undefined,
		deleteTag: (name: string, onSuccess: () => void) =>
			deleteMutation.mutate({ name }, { onSuccess }),
		deletingTag: deleteMutation.isPending
			? deleteMutation.variables?.name
			: undefined,
	};
}
