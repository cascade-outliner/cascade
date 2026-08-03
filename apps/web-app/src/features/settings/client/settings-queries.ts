import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SettingsPatch } from "@/features/settings/model/settings.schema";
import { orpc } from "@/orpc/client";

export function useRemoteSettings() {
	return useQuery(orpc.settings.get.queryOptions());
}

export function useUpdateSettings(
	onSuccess: (merged: SettingsPatch, patch: SettingsPatch) => void,
) {
	const queryClient = useQueryClient();
	const queryOptions = orpc.settings.get.queryOptions();

	return useMutation(
		orpc.settings.update.mutationOptions({
			onSuccess: (merged, patch) => {
				queryClient.setQueryData(queryOptions.queryKey, merged);
				onSuccess(merged, patch);
			},
		}),
	);
}
