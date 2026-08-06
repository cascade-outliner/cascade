import { Button } from "@cascade/ui/button";
import { m } from "#/paraglide/messages.js";
import { getLocale } from "#/paraglide/runtime.js";
import {
	formatDeviceLabel,
	formatSessionActivity,
	parseSessionDevice,
} from "@/features/sessions/model/session-display";
import type { ActiveSession } from "@/features/sessions/server/session-procedures";
import { DeviceIcon } from "@/features/sessions/ui/device-icon";

export function SessionRow({
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
					<span className="font-semibold">{formatDeviceLabel(session)}</span>
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
