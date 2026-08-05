import { Tabs } from "@base-ui/react";
import type { ReactNode } from "react";
import { m } from "#/paraglide/messages.js";
import { TagSettingsPanel } from "@/features/nodes/ui/tag-settings";
import { SecuritySettingsPanel } from "@/features/sessions/ui/security-settings-panel";
import type { Settings } from "@/features/settings/model/settings.schema";
import { AppearanceSettingsPanel } from "@/features/settings/ui/appearance-settings-panel";
import { GeneralSettingsPanel } from "@/features/settings/ui/general-settings-panel";
import { PremiumTab } from "../../../premium/ui/premium-tab";
import type { UserMenuUser } from "../../model/user-menu.types";
import { QuickLinksPanel } from "../quick-links-panel";
import { UserAccountPanel } from "../user-account-panel";
import { settingsPanel } from "../user-menu.styles";
import type { SettingsTab } from "./tab-groups";

interface SettingsTabPanelProps {
	value: SettingsTab["value"];
	heading: string;
	visited: boolean;
	children: ReactNode;
}

/** One `Tabs.Panel`, keeping the heading (hidden on mobile, where
 * `MobileTabNav`'s page header already shows it) and mount-once behavior
 * consistent across every settings section. */
function SettingsTabPanel({
	value,
	heading,
	visited,
	children,
}: SettingsTabPanelProps) {
	return (
		<Tabs.Panel value={value} keepMounted={visited} className={settingsPanel()}>
			<div className="w-full">
				<h2 className="mb-2 hidden text-xl font-semibold sm:block">
					{heading}
				</h2>
				{children}
			</div>
		</Tabs.Panel>
	);
}

interface SettingsPanelsProps {
	visitedTabs: ReadonlySet<SettingsTab["value"]>;
	settings: Settings;
	setSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
	user: UserMenuUser;
	isPremium: boolean | undefined;
	onSignOut: () => void;
	onOpenDeleteDialog: () => void;
	onReplayTour: () => void;
	isReplayingTour: boolean;
}

export function SettingsPanels({
	visitedTabs,
	settings,
	setSetting,
	user,
	isPremium,
	onSignOut,
	onOpenDeleteDialog,
	onReplayTour,
	isReplayingTour,
}: SettingsPanelsProps) {
	return (
		<div className="relative min-h-0 flex-1">
			<SettingsTabPanel
				value="general"
				heading={m.user_menu_general_tab()}
				visited={visitedTabs.has("general")}
			>
				<GeneralSettingsPanel
					settings={settings}
					setSetting={setSetting}
					onReplayTour={onReplayTour}
					isReplayingTour={isReplayingTour}
				/>
			</SettingsTabPanel>
			<SettingsTabPanel
				value="appearance"
				heading={m.settings_appearance_tab()}
				visited={visitedTabs.has("appearance")}
			>
				<AppearanceSettingsPanel
					settings={settings}
					isPremium={isPremium ?? false}
					setSetting={setSetting}
				/>
			</SettingsTabPanel>
			<SettingsTabPanel
				value="user"
				heading={m.user_menu_user_tab()}
				visited={visitedTabs.has("user")}
			>
				<UserAccountPanel
					user={user}
					isPremium={isPremium}
					onSignOut={onSignOut}
					onOpenDeleteDialog={onOpenDeleteDialog}
				/>
			</SettingsTabPanel>
			<SettingsTabPanel
				value="tags"
				heading={m.settings_tags_tab()}
				visited={visitedTabs.has("tags")}
			>
				<TagSettingsPanel />
			</SettingsTabPanel>
			<SettingsTabPanel
				value="security"
				heading={m.security_tab()}
				visited={visitedTabs.has("security")}
			>
				<SecuritySettingsPanel />
			</SettingsTabPanel>
			<SettingsTabPanel
				value="premium"
				heading={m.user_menu_premium_tab()}
				visited={visitedTabs.has("premium")}
			>
				<PremiumTab />
			</SettingsTabPanel>
			<SettingsTabPanel
				value="links"
				heading={m.user_menu_quick_links()}
				visited={visitedTabs.has("links")}
			>
				<QuickLinksPanel />
			</SettingsTabPanel>
		</div>
	);
}
