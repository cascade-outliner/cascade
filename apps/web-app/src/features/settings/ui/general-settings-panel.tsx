import { Button } from "@cascade/ui/button";
import { Checkbox } from "@cascade/ui/checkbox";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { m } from "#/paraglide/messages.js";
import type { Settings } from "../model/settings.schema";
import {
	SettingsPageDescription,
	SettingsRow,
	SettingsSection,
} from "./settings-panel";

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

	return (
		<>
			<SettingsPageDescription>
				{m.settings_general_description()}
			</SettingsPageDescription>
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
