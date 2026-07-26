import { Dialog, Tabs } from "@base-ui/react";
import {
	CrownIcon,
	LinkIcon,
	PaletteIcon,
	ShieldCheckIcon,
	TagIcon,
	UserCircleIcon,
	XIcon,
} from "@phosphor-icons/react/ssr";
import { useQuery } from "@tanstack/react-query";
import type { ComponentType } from "react";
import { m } from "#/paraglide/messages.js";
import { TagSettingsPanel } from "@/features/nodes/ui/tag-settings-panel";
import { SecuritySettingsPanel } from "@/features/sessions/ui/security-settings-panel";
import type { Settings } from "@/features/settings/model/settings.schema";
import { AppearanceSettingsPanel } from "@/features/settings/ui/appearance-settings-panel";
import { orpc } from "@/orpc/client";
import { PremiumTab } from "../../premium/ui/premium-tab";
import type { UserMenuUser } from "../model/user-menu.types";
import { QuickLinksPanel } from "./quick-links-panel";
import { UserAccountPanel } from "./user-account-panel";
import {
	iconButton,
	settingsDialogPopup,
	tabTrigger,
} from "./user-menu.styles";

export interface UserSettingsDialogProps {
	user: UserMenuUser;
	settings: Settings;
	setSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSignOut: () => void;
	onOpenDeleteDialog: () => void;
}

interface SettingsTab {
	value: "appearance" | "tags" | "user" | "security" | "premium" | "links";
	label: () => string;
	icon: ComponentType<{ size?: number; weight?: "bold" }>;
}

const tabGroups: { label: () => string; tabs: SettingsTab[] }[] = [
	{
		label: () => m.settings_group_preferences(),
		tabs: [
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

export function UserSettingsDialog({
	user,
	settings,
	setSetting,
	open,
	onOpenChange,
	onSignOut,
	onOpenDeleteDialog,
}: UserSettingsDialogProps) {
	const { data: premium } = useQuery(orpc.premium.get.queryOptions());

	return (
		<Dialog.Root open={open} onOpenChange={onOpenChange}>
			<Dialog.Portal>
				<Dialog.Backdrop className="fixed inset-0 z-50 bg-surface/20 backdrop-blur-sm" />
				<Dialog.Popup className={settingsDialogPopup()}>
					<div className="flex h-16 shrink-0 items-center justify-between border-b border-ink/10 px-5 sm:px-6 dark:border-surface/15">
						<Dialog.Title className="text-lg font-semibold">
							{m.user_menu_settings()}
						</Dialog.Title>
						<Dialog.Close
							aria-label={m.user_menu_close_settings()}
							className={iconButton()}
						>
							<XIcon size={16} weight="bold" />
						</Dialog.Close>
					</div>
					<Tabs.Root
						defaultValue="appearance"
						orientation="vertical"
						className="grid min-h-0 flex-1 grid-cols-[9.5rem_minmax(0,1fr)] sm:grid-cols-[14rem_minmax(0,1fr)]"
					>
						<Tabs.List className="overflow-y-auto border-r border-ink/10 bg-surface/35 px-2 py-4 sm:px-3 dark:border-surface/15 dark:bg-surface/5">
							{tabGroups.map((group) => (
								<div key={group.label()} className="mb-5 last:mb-0">
									<div className="mb-1.5 px-2.5 text-[0.6875rem] font-semibold tracking-wider text-ink/45 uppercase dark:text-surface/45">
										{group.label()}
									</div>
									<div className="flex flex-col gap-0.5">
										{group.tabs.map((tab) => {
											const Icon = tab.icon;
											return (
												<Tabs.Tab
													key={tab.value}
													value={tab.value}
													className={tabTrigger()}
												>
													<Icon size={17} weight="bold" />
													<span>{tab.label()}</span>
												</Tabs.Tab>
											);
										})}
									</div>
								</div>
							))}
						</Tabs.List>
						<div className="min-w-0 overflow-y-auto">
							<Tabs.Panel value="appearance" className="p-5 sm:p-8">
								<div className="w-full">
									<h2 className="mb-2 text-xl font-semibold">
										{m.settings_appearance_tab()}
									</h2>
									<AppearanceSettingsPanel
										settings={settings}
										isPremium={premium?.isPremium ?? false}
										setSetting={setSetting}
									/>
								</div>
							</Tabs.Panel>
							<Tabs.Panel value="user" className="p-5 sm:p-8">
								<div className="w-full">
									<h2 className="mb-2 text-xl font-semibold">
										{m.user_menu_user_tab()}
									</h2>
									<UserAccountPanel
										user={user}
										isPremium={premium?.isPremium}
										onSignOut={onSignOut}
										onOpenDeleteDialog={onOpenDeleteDialog}
									/>
								</div>
							</Tabs.Panel>
							<Tabs.Panel value="tags" className="p-5 sm:p-8">
								<div className="w-full">
									<h2 className="mb-2 text-xl font-semibold">
										{m.settings_tags_tab()}
									</h2>
									<TagSettingsPanel />
								</div>
							</Tabs.Panel>
							<Tabs.Panel value="security" className="p-5 sm:p-8">
								<div className="w-full">
									<h2 className="mb-2 text-xl font-semibold">
										{m.security_tab()}
									</h2>
									<SecuritySettingsPanel />
								</div>
							</Tabs.Panel>
							<Tabs.Panel value="premium" className="p-5 sm:p-8">
								<div className="w-full">
									<h2 className="mb-2 text-xl font-semibold">
										{m.user_menu_premium_tab()}
									</h2>
									<PremiumTab />
								</div>
							</Tabs.Panel>
							<Tabs.Panel value="links" className="p-5 sm:p-8">
								<div className="w-full">
									<h2 className="mb-2 text-xl font-semibold">
										{m.user_menu_quick_links()}
									</h2>
									<QuickLinksPanel />
								</div>
							</Tabs.Panel>
						</div>
					</Tabs.Root>
				</Dialog.Popup>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
