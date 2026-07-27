import { AlertDialog } from "@base-ui/react";
import { Button } from "@cascade/ui/button";
import {
	DesktopIcon,
	DeviceMobileIcon,
	DeviceTabletIcon,
	QuestionIcon,
	SignOutIcon,
} from "@phosphor-icons/react/ssr";
import { m } from "#/paraglide/messages.js";
import { getLocale } from "#/paraglide/runtime.js";
import {
	useRevokeOtherSessions,
	useRevokeSession,
	useSessions,
} from "@/features/sessions/client/use-sessions";
import {
	formatSessionActivity,
	parseSessionDevice,
	type SessionDeviceType,
} from "@/features/sessions/model/session-display";
import type { ActiveSession } from "@/features/sessions/server/session-procedures";
import {
	SettingsPageDescription,
	SettingsSection,
} from "@/features/settings/ui/settings-panel";
import { alertPopup } from "@/features/user-menu/ui/user-menu.styles";

function DeviceIcon({ type }: { type: SessionDeviceType }) {
	const props = { size: 20, weight: "bold" as const };
	switch (type) {
		case "desktop":
			return <DesktopIcon {...props} />;
		case "mobile":
			return <DeviceMobileIcon {...props} />;
		case "tablet":
			return <DeviceTabletIcon {...props} />;
		default:
			return <QuestionIcon {...props} />;
	}
}

function deviceLabel(session: ActiveSession): string {
	const device = parseSessionDevice(session.userAgent);
	if (device.browser && device.os) {
		return m.security_device_browser_os({
			browser: device.browser,
			os: device.os,
		});
	}
	return device.browser ?? device.os ?? m.security_unknown_device();
}

function SessionRow({
	session,
	disabled,
	isRevoking,
	onRevoke,
}: {
	session: ActiveSession;
	disabled: boolean;
	isRevoking: boolean;
	onRevoke: () => void;
}) {
	const device = parseSessionDevice(session.userAgent);
	const exactTime = new Intl.DateTimeFormat(getLocale(), {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(new Date(session.updatedAt));
	const activity = formatSessionActivity(
		new Date(session.updatedAt),
		getLocale(),
	);

	return (
		<li className="flex flex-wrap items-start gap-3 border-b border-ink/10 px-4 py-4 last:border-b-0 sm:flex-nowrap sm:px-5 dark:border-surface/15">
			<div className="mt-0.5 text-ink/60 dark:text-surface/60">
				<DeviceIcon type={device.type} />
			</div>
			<div className="min-w-0 flex-1">
				<div className="flex flex-wrap items-center gap-2">
					<span className="font-semibold">{deviceLabel(session)}</span>
					{session.isCurrent && (
						<span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">
							{m.security_current_session()}
						</span>
					)}
				</div>
				<div className="mt-0.5 text-ink/60 dark:text-surface/60">
					{session.ipAddress ?? m.security_unknown_location()}
				</div>
				<div
					className="text-ink/60 dark:text-surface/60"
					title={m.security_last_active_exact({ date: exactTime })}
				>
					{m.security_last_active({ time: activity })}
				</div>
			</div>
			{!session.isCurrent && (
				<Button
					type="button"
					size="sm"
					variant="dark"
					disabled={disabled}
					onClick={onRevoke}
					className="ml-8 shrink-0 sm:ml-0"
				>
					{isRevoking ? m.security_revoking() : m.security_revoke()}
				</Button>
			)}
		</li>
	);
}

export function SecuritySettingsPanel() {
	const sessions = useSessions();
	const { revokeSession, revokingSessionId } = useRevokeSession();
	const { revokeOtherSessions, isRevokingOtherSessions } =
		useRevokeOtherSessions();
	const otherSessionCount =
		sessions.data?.filter((session) => !session.isCurrent).length ?? 0;

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
					<AlertDialog.Root>
						<AlertDialog.Trigger
							render={
								<Button
									type="button"
									size="sm"
									variant="danger"
									disabled={
										otherSessionCount === 0 ||
										revokingSessionId !== undefined ||
										isRevokingOtherSessions
									}
									icon={<SignOutIcon size={14} weight="bold" />}
								/>
							}
						>
							{m.security_sign_out_others()}
						</AlertDialog.Trigger>
						<AlertDialog.Portal>
							<AlertDialog.Backdrop className="fixed inset-0 z-50 bg-surface/20 backdrop-blur-sm" />
							<AlertDialog.Popup className={alertPopup()}>
								<AlertDialog.Title className="text-lg font-semibold">
									{m.security_sign_out_others()}
								</AlertDialog.Title>
								<AlertDialog.Description className="mt-2 text-sm">
									{m.security_sign_out_others_confirm()}
								</AlertDialog.Description>
								<div className="mt-6 flex justify-end gap-2">
									<AlertDialog.Close
										disabled={isRevokingOtherSessions}
										render={<Button type="button" size="sm" variant="dark" />}
									>
										{m.user_menu_cancel()}
									</AlertDialog.Close>
									<AlertDialog.Close
										render={
											<Button
												type="button"
												size="sm"
												variant="danger"
												disabled={isRevokingOtherSessions}
												onClick={revokeOtherSessions}
											/>
										}
									>
										{isRevokingOtherSessions
											? m.security_signing_out_others()
											: m.security_sign_out_others()}
									</AlertDialog.Close>
								</div>
							</AlertDialog.Popup>
						</AlertDialog.Portal>
					</AlertDialog.Root>
				</div>
			</SettingsSection>
		</>
	);
}
