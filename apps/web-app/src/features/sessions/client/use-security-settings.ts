import {
	useRevokeOtherSessions,
	useRevokeSession,
	useSessions,
} from "@/features/sessions/client/use-sessions";

export function useSecuritySettings() {
	const sessions = useSessions();
	const { revokeSession, revokingSessionId } = useRevokeSession();
	const { revokeOtherSessions, isRevokingOtherSessions } =
		useRevokeOtherSessions();
	const otherSessionCount =
		sessions.data?.filter((session) => !session.isCurrent).length ?? 0;

	return {
		sessions,
		revokeSession,
		revokingSessionId,
		revokeOtherSessions,
		isRevokingOtherSessions,
		otherSessionCount,
	};
}
