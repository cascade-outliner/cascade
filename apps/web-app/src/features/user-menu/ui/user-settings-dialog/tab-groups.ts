import {
	CircleDashedIcon,
	CrownIcon,
	GearIcon,
	LinkIcon,
	PaletteIcon,
	ShieldCheckIcon,
	TagIcon,
	UserCircleIcon,
} from "@phosphor-icons/react/ssr";
import type { ComponentType } from "react";
import { m } from "#/paraglide/messages.js";

export interface SettingsTab {
	value:
		| "general"
		| "appearance"
		| "tags"
		| "statuses"
		| "user"
		| "security"
		| "premium"
		| "links";
	label: () => string;
	icon: ComponentType<{
		size?: number;
		weight?: "bold";
		className?: string;
	}>;
}

export const tabGroups: { label: () => string; tabs: SettingsTab[] }[] = [
	{
		label: () => m.settings_group_preferences(),
		tabs: [
			{
				value: "general",
				label: () => m.user_menu_general_tab(),
				icon: GearIcon,
			},
			{
				value: "appearance",
				label: () => m.settings_appearance_tab(),
				icon: PaletteIcon,
			},
			{
				value: "tags",
				label: () => m.settings_tags_tab(),
				icon: TagIcon,
			},
			{
				value: "statuses",
				label: () => m.settings_statuses_tab(),
				icon: CircleDashedIcon,
			},
		],
	},
	{
		label: () => m.settings_group_account(),
		tabs: [
			{
				value: "user",
				label: () => m.user_menu_user_tab(),
				icon: UserCircleIcon,
			},
			{
				value: "security",
				label: () => m.security_tab(),
				icon: ShieldCheckIcon,
			},
			{
				value: "premium",
				label: () => m.user_menu_premium_tab(),
				icon: CrownIcon,
			},
		],
	},
	{
		label: () => m.settings_group_resources(),
		tabs: [
			{
				value: "links",
				label: () => m.user_menu_quick_links(),
				icon: LinkIcon,
			},
		],
	},
] as const;
