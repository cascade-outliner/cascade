import { Button } from "@cascade/ui/button";
import { m } from "#/paraglide/messages.js";
import { useSecuritySettings } from "@/features/sessions/client/use-security-settings";
import { SessionRow } from "@/features/sessions/ui/session-row";
import { SignOutOtherSessionsDialog } from "@/features/sessions/ui/sign-out-other-sessions-dialog";
import {
	SettingsPageDescription,
	SettingsSection,
} from "@/features/settings/ui/settings-panel";

export function SecuritySettingsPanel() {
	const {
		sessions,
		revokeSession,
		revokingSessionId,
		revokeOtherSessions,
		isRevokingOtherSessions,
		otherSessionCount,
	} = useSecuritySettings();

	return (
		<>
			<SettingsPageDescription>
				{m.security_sessions_description()}
			</SettingsPageDescription>
			<SettingsSection title={m.settings_active_sessions_section()}>
				{sessions.isPending ? (
					<p className="px-5 py-4 text-sm">{m.security_loading_sessions()}</p>
				) : sessions.isError ? (
					<div className="flex items-center justify-between gap-3 px-5 py-4 text-sm">
						<p>{m.security_load_failed()}</p>
						<Button
							type="button"
							size="sm"
							variant="dark"
							onClick={() => sessions.refetch()}
						>
							{m.security_retry()}
						</Button>
					</div>
				) : (
					<ul className="text-sm">
						{sessions.data.map((session) => (
							<SessionRow
								key={session.id}
								session={session}
								disabled={
									revokingSessionId !== undefined || isRevokingOtherSessions
								}
								isRevoking={revokingSessionId === session.id}
								onRevoke={() => revokeSession(session.id)}
							/>
						))}
					</ul>
				)}
			</SettingsSection>
			<SettingsSection
				title={m.settings_security_actions_section()}
				description={m.settings_security_actions_description()}
			>
				<div className="px-5 py-4">
					<SignOutOtherSessionsDialog
						disabled={
							otherSessionCount === 0 ||
							revokingSessionId !== undefined ||
							isRevokingOtherSessions
						}
						isRevoking={isRevokingOtherSessions}
						onConfirm={revokeOtherSessions}
					/>
				</div>
			</SettingsSection>
		</>
	);
}
