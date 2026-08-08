import { Button } from "@cascade/ui/button";
import { Checkbox } from "@cascade/ui/checkbox";
import { toast } from "@cascade/ui/toast";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { useEffect, useState } from "react";
import { m } from "#/paraglide/messages.js";
import type { Settings } from "../model/settings.schema";
import {
	SettingsPageDescription,
	SettingsRow,
	SettingsSection,
} from "./settings-panel";

async function enableDueDateNotifications(): Promise<void> {
	if (typeof Notification === "undefined") {
		toast.info(m.settings_notification_unsupported());
		return;
	}
	const permission = await Notification.requestPermission();
	if (permission === "denied") {
		toast.warning(m.settings_notification_permission_denied());
	}
}

/**
 * `Notification` support can only be checked client-side, so this starts
 * `false` (matching SSR) and flips after mount rather than being computed
 * during render, to avoid a hydration mismatch.
 */
function useNotificationsUnsupported(): boolean {
	const [unsupported, setUnsupported] = useState(false);
	useEffect(() => {
		setUnsupported(typeof Notification === "undefined");
	}, []);
	return unsupported;
}

interface GeneralSettingsPanelProps {
	settings: Settings;
	setSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
	onReplayTour: () => void;
	isReplayingTour: boolean;
}

export function GeneralSettingsPanel({
	settings,
	setSetting,
	onReplayTour,
	isReplayingTour,
}: GeneralSettingsPanelProps) {
	const [, setCompletedOverride] = useQueryState(
		"completed",
		parseAsStringLiteral(["hidden", "visible"]),
	);
	const notificationsUnsupported = useNotificationsUnsupported();
	const capabilities = new Set(settings.enabledNodeCapabilities);

	return (
		<>
			<SettingsPageDescription>
				{m.settings_general_description()}
			</SettingsPageDescription>
			{capabilities.has("task") && (
				<SettingsSection title={m.settings_tasks_section()}>
					<SettingsRow
						title={m.settings_hide_completed_default()}
						description={m.settings_hide_completed_default_description()}
					>
						<Checkbox
							aria-label={m.settings_hide_completed_default()}
							checked={settings.hideCompletedByDefault}
							onCheckedChange={(checked) => {
								setSetting("hideCompletedByDefault", checked);
								void setCompletedOverride(null);
							}}
						/>
					</SettingsRow>
				</SettingsSection>
			)}
			{capabilities.has("due-date") && (
				<SettingsSection title={m.settings_notifications_section()}>
					<SettingsRow
						title={m.settings_due_date_notifications()}
						description={
							notificationsUnsupported
								? m.settings_due_date_notifications_description_unsupported()
								: m.settings_due_date_notifications_description()
						}
					>
						<Checkbox
							aria-label={m.settings_due_date_notifications()}
							checked={settings.dueDateNotificationsEnabled}
							onCheckedChange={(checked) => {
								setSetting("dueDateNotificationsEnabled", checked);
								if (checked) void enableDueDateNotifications();
							}}
						/>
					</SettingsRow>
				</SettingsSection>
			)}
			<SettingsSection title={m.settings_replay_tour_title()}>
				<SettingsRow title={m.settings_replay_tour_description()}>
					<Button
						size="sm"
						variant="dark"
						onClick={onReplayTour}
						disabled={isReplayingTour}
					>
						{m.settings_replay_tour_button()}
					</Button>
				</SettingsRow>
			</SettingsSection>
		</>
	);
}
