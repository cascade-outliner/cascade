import { Dialog, Tabs } from "@base-ui/react";
import { XIcon } from "@phosphor-icons/react/ssr";
import { useQuery } from "@tanstack/react-query";
import { m } from "#/paraglide/messages.js";
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

const tabs = [
	{ value: "general", label: () => m.user_menu_general_tab() },
	{ value: "user", label: () => m.user_menu_user_tab() },
	{ value: "premium", label: () => m.user_menu_premium_tab() },
	{ value: "links", label: () => m.user_menu_quick_links() },
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
					<div className="mb-4 flex items-center justify-between">
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
					<Tabs.Root defaultValue="general">
						<Tabs.List className="mb-4 flex gap-4 border-b border-ink/10 dark:border-surface/15">
							{tabs.map((tab) => (
								<Tabs.Tab
									key={tab.value}
									value={tab.value}
									className={tabTrigger()}
								>
									{tab.label()}
								</Tabs.Tab>
							))}
						</Tabs.List>
						<Tabs.Panel value="general">
							<AppearanceSettingsPanel
								settings={settings}
								isPremium={premium?.isPremium ?? false}
								setSetting={setSetting}
							/>
						</Tabs.Panel>
						<Tabs.Panel value="user">
							<UserAccountPanel
								user={user}
								isPremium={premium?.isPremium}
								onSignOut={onSignOut}
								onOpenDeleteDialog={onOpenDeleteDialog}
							/>
						</Tabs.Panel>
						<Tabs.Panel value="premium">
							<PremiumTab />
						</Tabs.Panel>
						<Tabs.Panel value="links">
							<QuickLinksPanel />
						</Tabs.Panel>
					</Tabs.Root>
				</Dialog.Popup>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
