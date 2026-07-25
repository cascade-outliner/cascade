import { toast } from "@cascade/ui/toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { m } from "#/paraglide/messages.js";
import { orpc } from "@/orpc/client";

export function useSessions() {
	return useQuery(orpc.sessions.list.queryOptions());
}

export function useRevokeSession() {
	const queryClient = useQueryClient();
	const queryOptions = orpc.sessions.list.queryOptions();
	const mutation = useMutation(
		orpc.sessions.revoke.mutationOptions({
			onSuccess: (_result, input) => {
				queryClient.setQueryData(queryOptions.queryKey, (sessions) =>
					sessions?.filter((session) => session.id !== input.sessionId),
				);
				toast.success(m.security_session_revoked());
			},
			onError: () => toast.error(m.security_session_revoke_failed()),
		}),
	);

	return {
		revokeSession: (sessionId: string) => mutation.mutate({ sessionId }),
		revokingSessionId: mutation.isPending
			? mutation.variables?.sessionId
			: undefined,
	};
}

export function useRevokeOtherSessions() {
	const queryClient = useQueryClient();
	const queryOptions = orpc.sessions.list.queryOptions();
	const mutation = useMutation(
		orpc.sessions.revokeOthers.mutationOptions({
			onSuccess: () => {
				queryClient.setQueryData(queryOptions.queryKey, (sessions) =>
					sessions?.filter((session) => session.isCurrent),
				);
				toast.success(m.security_other_sessions_revoked());
			},
			onError: () => toast.error(m.security_other_sessions_revoke_failed()),
		}),
	);

	return {
		revokeOtherSessions: () => mutation.mutate(undefined),
		isRevokingOtherSessions: mutation.isPending,
	};
}
