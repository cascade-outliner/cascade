import { toast } from "@cascade/ui/toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { m } from "#/paraglide/messages.js";
import { orpc } from "@/orpc/client";

/** This user's premium seat status. `data` is `undefined` while loading —
 * callers gating a feature on premium should treat that as "unknown yet",
 * not "not premium", to avoid a flash of upsell UI before the first load
 * resolves. */
export function usePremiumStatus() {
	return useQuery(orpc.premium.get.queryOptions());
}

/** Requests a premium seat for the current user (granted immediately) and
 * refreshes `usePremiumStatus`. Shared by every premium upsell surface, not
 * just the Settings > Premium tab, so they all get the same toasts. */
export function useRequestPremiumSeat() {
	const queryClient = useQueryClient();
	const queryOptions = orpc.premium.get.queryOptions();
	const mutation = useMutation(
		orpc.premium.requestSeat.mutationOptions({
			onSuccess: (status) => {
				queryClient.setQueryData(queryOptions.queryKey, status);
				toast.success(m.user_menu_premium_request_success());
			},
			onError: () => {
				toast.error(m.user_menu_premium_request_failed());
			},
		}),
	);
	return {
		requestSeat: () => mutation.mutate(undefined),
		isRequesting: mutation.isPending,
	};
}

/** Removes the current user's premium seat and refreshes `usePremiumStatus`. */
export function useRevokePremiumSeat() {
	const queryClient = useQueryClient();
	const queryOptions = orpc.premium.get.queryOptions();
	const mutation = useMutation(
		orpc.premium.revokeSeat.mutationOptions({
			onSuccess: (status) => {
				queryClient.setQueryData(queryOptions.queryKey, status);
				toast.success(m.user_menu_premium_remove_success());
			},
			onError: () => {
				toast.error(m.user_menu_premium_remove_failed());
			},
		}),
	);
	return {
		revokeSeat: () => mutation.mutate(undefined),
		isRevoking: mutation.isPending,
	};
}
