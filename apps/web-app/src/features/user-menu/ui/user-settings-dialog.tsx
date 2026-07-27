import { Dialog, Tabs } from "@base-ui/react";
import {
	dialogBackdropMotion,
	dialogPopupMotion,
} from "@cascade/ui/dialog-motion";
import {
	ArrowLeftIcon,
	CaretRightIcon,
	CrownIcon,
	LinkIcon,
	PaletteIcon,
	ShieldCheckIcon,
	TagIcon,
	UserCircleIcon,
	XIcon,
} from "@phosphor-icons/react/ssr";
import { useQuery } from "@tanstack/react-query";
import { type ComponentType, useState } from "react";
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
	settingsPanel,
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
	icon: ComponentType<{
		size?: number;
		weight?: "bold";
		className?: string;
	}>;
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
	const [activeTab, setActiveTab] =
		useState<SettingsTab["value"]>("appearance");
	const [visitedTabs, setVisitedTabs] = useState<
		ReadonlySet<SettingsTab["value"]>
	>(() => new Set(["appearance"]));
	const [mobilePageOpen, setMobilePageOpen] = useState(false);
	const activeTabLabel = tabGroups
		.flatMap((group) => group.tabs)
		.find((tab) => tab.value === activeTab)
		?.label();
	const selectTab = (value: SettingsTab["value"]) => {
		setVisitedTabs((current) => {
			if (current.has(value)) return current;
			return new Set(current).add(value);
		});
		setActiveTab(value);
	};

	return (
		<Dialog.Root
			open={open}
			onOpenChange={(nextOpen) => {
				if (!nextOpen) setMobilePageOpen(false);
				onOpenChange(nextOpen);
			}}
		>
			<Dialog.Portal>
				<Dialog.Backdrop className={dialogBackdropMotion()} />
				<Dialog.Popup
					className={`${settingsDialogPopup()} ${dialogPopupMotion({ variant: "fullscreen" })}`}
				>
					<div className="flex h-14 shrink-0 items-center justify-between border-b border-ink/10 px-4 sm:h-16 sm:px-6 dark:border-surface/15">
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
						value={activeTab}
						onValueChange={(value) => selectTab(value as SettingsTab["value"])}
						orientation="vertical"
						className="relative flex min-h-0 flex-1 flex-col sm:grid sm:grid-cols-[14rem_minmax(0,1fr)]"
					>
						<div
							className={`absolute inset-0 overflow-y-auto bg-white px-4 py-5 transition-[transform,opacity,visibility] duration-200 ease-out sm:hidden dark:bg-surface/5 motion-reduce:transition-opacity motion-reduce:duration-75 ${
								mobilePageOpen
									? "pointer-events-none invisible -translate-x-1/4 opacity-0 motion-reduce:translate-x-0"
									: "visible translate-x-0 opacity-100"
							}`}
						>
							{tabGroups.map((group) => (
								<section key={group.label()} className="mb-6 last:mb-0">
									<h2 className="mb-2 px-1 text-xs font-semibold tracking-wider text-ink/45 uppercase dark:text-surface/45">
										{group.label()}
									</h2>
									<div className="overflow-hidden rounded-xl border border-ink/10 bg-white dark:border-surface/15 dark:bg-surface/5">
										{group.tabs.map((tab) => {
											const Icon = tab.icon;
											return (
												<button
													type="button"
													key={tab.value}
													className="flex min-h-14 w-full cursor-pointer items-center gap-3 border-b border-ink/10 px-4 text-left outline-none transition-colors duration-150 last:border-b-0 hover:bg-surface/70 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-danger/50 dark:border-surface/15 dark:hover:bg-surface/10"
													onClick={() => {
														selectTab(tab.value);
														setMobilePageOpen(true);
													}}
												>
													<Icon
														size={19}
														weight="bold"
														className="text-ink/55 dark:text-surface/55"
													/>
													<span className="flex-1 text-sm font-medium">
														{tab.label()}
													</span>
													<CaretRightIcon
														size={16}
														weight="bold"
														className="text-ink/35 dark:text-surface/35"
													/>
												</button>
											);
										})}
									</div>
								</section>
							))}
						</div>
						<Tabs.List className="hidden overflow-y-auto border-r border-ink/10 bg-white px-3 py-4 sm:block dark:border-surface/15 dark:bg-surface/5">
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
						<div
							className={`absolute inset-0 flex min-h-0 min-w-0 flex-1 flex-col transition-[transform,opacity,visibility] duration-200 ease-out sm:visible sm:relative sm:inset-auto sm:transition-none motion-reduce:transition-opacity motion-reduce:duration-75 ${
								mobilePageOpen
									? "visible translate-x-0 opacity-100"
									: "pointer-events-none invisible translate-x-full opacity-0 motion-reduce:translate-x-0 sm:pointer-events-auto sm:translate-x-0 sm:opacity-100"
							}`}
						>
							<div className="flex h-12 shrink-0 items-center gap-2 border-b border-ink/10 px-3 sm:hidden dark:border-surface/15">
								<button
									type="button"
									className={iconButton()}
									aria-label={m.user_menu_settings()}
									onClick={() => setMobilePageOpen(false)}
								>
									<ArrowLeftIcon size={18} weight="bold" />
								</button>
								<span className="truncate font-semibold">{activeTabLabel}</span>
							</div>
							<div className="relative min-h-0 flex-1">
								<Tabs.Panel
									value="appearance"
									keepMounted={visitedTabs.has("appearance")}
									className={settingsPanel()}
								>
									<div className="w-full">
										<h2 className="mb-2 hidden text-xl font-semibold sm:block">
											{m.settings_appearance_tab()}
										</h2>
										<AppearanceSettingsPanel
											settings={settings}
											isPremium={premium?.isPremium ?? false}
											setSetting={setSetting}
										/>
									</div>
								</Tabs.Panel>
								<Tabs.Panel
									value="user"
									keepMounted={visitedTabs.has("user")}
									className={settingsPanel()}
								>
									<div className="w-full">
										<h2 className="mb-2 hidden text-xl font-semibold sm:block">
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
								<Tabs.Panel
									value="tags"
									keepMounted={visitedTabs.has("tags")}
									className={settingsPanel()}
								>
									<div className="w-full">
										<h2 className="mb-2 hidden text-xl font-semibold sm:block">
											{m.settings_tags_tab()}
										</h2>
										<TagSettingsPanel />
									</div>
								</Tabs.Panel>
								<Tabs.Panel
									value="security"
									keepMounted={visitedTabs.has("security")}
									className={settingsPanel()}
								>
									<div className="w-full">
										<h2 className="mb-2 hidden text-xl font-semibold sm:block">
											{m.security_tab()}
										</h2>
										<SecuritySettingsPanel />
									</div>
								</Tabs.Panel>
								<Tabs.Panel
									value="premium"
									keepMounted={visitedTabs.has("premium")}
									className={settingsPanel()}
								>
									<div className="w-full">
										<h2 className="mb-2 hidden text-xl font-semibold sm:block">
											{m.user_menu_premium_tab()}
										</h2>
										<PremiumTab />
									</div>
								</Tabs.Panel>
								<Tabs.Panel
									value="links"
									keepMounted={visitedTabs.has("links")}
									className={settingsPanel()}
								>
									<div className="w-full">
										<h2 className="mb-2 hidden text-xl font-semibold sm:block">
											{m.user_menu_quick_links()}
										</h2>
										<QuickLinksPanel />
									</div>
								</Tabs.Panel>
							</div>
						</div>
					</Tabs.Root>
				</Dialog.Popup>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
