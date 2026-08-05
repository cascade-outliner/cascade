import { useMutation, useQueryClient } from "@tanstack/react-query";
import { orpc } from "@/orpc/client";

/** Adds back whatever sample-outline nodes the tour needs (never removing
 * anything else) and marks the tour as not completed. Writes the merged
 * settings straight into the settings query cache on success, same as
 * `useUpdateSettings`, so `useSettings()` picks up `onboardingCompleted:
 * false` and the tour starts once the caller closes the settings dialog. */
export function useReplayOnboardingTour() {
	const queryClient = useQueryClient();
	const queryOptions = orpc.settings.get.queryOptions();

	return useMutation(
		orpc.onboarding.replay.mutationOptions({
			onSuccess: (merged) => {
				queryClient.setQueryData(queryOptions.queryKey, merged);
			},
		}),
	);
}
