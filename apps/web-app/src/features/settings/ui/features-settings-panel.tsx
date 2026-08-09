import {
	type NodeCapabilityId,
	toggleNodeCapability,
} from "@cascade/outliner/node-capabilities";
import { Checkbox } from "@cascade/ui/checkbox";
import { m } from "#/paraglide/messages.js";
import type { Settings } from "../model/settings.schema";
import { SettingsPageDescription, SettingsSection } from "./settings-panel";

interface FeaturesSettingsPanelProps {
	settings: Settings;
	setSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
}

const metadataCapabilities: NodeCapabilityId[] = [
	"icon",
	"color",
	"due-date",
	"recurrence",
	"priority",
	"tags",
	"status",
];
const typeCapabilities: NodeCapabilityId[] = ["task", "board"];
const contentCapabilities: NodeCapabilityId[] = [
	"paragraph",
	"heading-1",
	"heading-2",
	"heading-3",
	"heading-4",
	"heading-5",
	"heading-6",
];

function capabilityLabel(id: NodeCapabilityId): string {
	const labels: Record<NodeCapabilityId, () => string> = {
		icon: m.settings_feature_icon,
		color: m.settings_feature_color,
		task: m.settings_feature_task,
		"due-date": m.settings_feature_due_date,
		recurrence: m.settings_feature_recurrence,
		priority: m.settings_feature_priority,
		tags: m.settings_feature_tags,
		board: m.settings_feature_board,
		status: m.settings_feature_status,
		paragraph: m.settings_feature_paragraph,
		"heading-1": m.settings_feature_heading_1,
		"heading-2": m.settings_feature_heading_2,
		"heading-3": m.settings_feature_heading_3,
		"heading-4": m.settings_feature_heading_4,
		"heading-5": m.settings_feature_heading_5,
		"heading-6": m.settings_feature_heading_6,
		search: m.settings_feature_search,
		duplicate: m.settings_feature_duplicate,
	};
	return labels[id]();
}

function capabilityDescription(id: NodeCapabilityId): string | undefined {
	const descriptions: Record<NodeCapabilityId, () => string> = {
		icon: m.settings_feature_icon_description,
		color: m.settings_feature_color_description,
		task: m.settings_feature_task_description,
		"due-date": m.settings_feature_due_date_description,
		recurrence: m.settings_feature_recurrence_dependency,
		priority: m.settings_feature_priority_description,
		tags: m.settings_feature_tags_description,
		board: m.settings_feature_board_description,
		status: m.settings_feature_status_dependency,
		paragraph: m.settings_feature_paragraph_required,
		"heading-1": m.settings_feature_heading_1_description,
		"heading-2": m.settings_feature_heading_2_description,
		"heading-3": m.settings_feature_heading_3_description,
		"heading-4": m.settings_feature_heading_4_description,
		"heading-5": m.settings_feature_heading_5_description,
		"heading-6": m.settings_feature_heading_6_description,
		search: m.settings_feature_search_description,
		duplicate: m.settings_feature_duplicate_description,
	};
	return descriptions[id]();
}

function CapabilityRows({
	ids,
	settings,
	setSetting,
}: FeaturesSettingsPanelProps & { ids: NodeCapabilityId[] }) {
	const enabled = new Set(settings.enabledNodeCapabilities);
	return ids.map((id) => (
		<div
			key={id}
			className="flex min-h-14 items-start justify-between gap-3 border-b border-ink/10 px-4 py-3 last:border-b-0 sm:min-h-16 sm:items-center sm:px-5 dark:border-surface/15"
		>
			<span className="min-w-0">
				<span className="block text-sm font-medium">{capabilityLabel(id)}</span>
				<span className="mt-0.5 block text-xs leading-relaxed text-ink/65 sm:text-sm dark:text-surface/55">
					{capabilityDescription(id)}
				</span>
			</span>
			<Checkbox
				aria-label={capabilityLabel(id)}
				className="mt-0.5 sm:mt-0"
				checked={enabled.has(id)}
				disabled={id === "paragraph"}
				onCheckedChange={(checked) =>
					setSetting(
						"enabledNodeCapabilities",
						toggleNodeCapability(settings.enabledNodeCapabilities, id, checked),
					)
				}
			/>
		</div>
	));
}

export function FeaturesSettingsPanel(props: FeaturesSettingsPanelProps) {
	return (
		<>
			<SettingsPageDescription>
				{m.settings_features_description()}
			</SettingsPageDescription>
			<SettingsSection title={m.settings_features_metadata_section()}>
				<CapabilityRows ids={metadataCapabilities} {...props} />
			</SettingsSection>
			<SettingsSection title={m.settings_features_types_section()}>
				<CapabilityRows ids={typeCapabilities} {...props} />
			</SettingsSection>
			<SettingsSection title={m.settings_features_content_section()}>
				<CapabilityRows ids={contentCapabilities} {...props} />
			</SettingsSection>
			<SettingsSection title={m.settings_features_actions_section()}>
				<CapabilityRows ids={["search", "duplicate"]} {...props} />
			</SettingsSection>
		</>
	);
}
