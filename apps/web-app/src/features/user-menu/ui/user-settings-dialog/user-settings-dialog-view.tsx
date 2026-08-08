import { Dialog, Tabs } from "@base-ui/react";
import {
	dialogBackdropMotion,
	dialogPanelMotion,
	dialogPopupMotion,
} from "@cascade/ui/dialog-motion";
import { ArrowLeftIcon, XIcon } from "@phosphor-icons/react/ssr";
import { m } from "#/paraglide/messages.js";
import type { Settings } from "@/features/settings/model/settings.schema";
import type { UserMenuUser } from "../../model/user-menu.types";
import { iconButton, settingsDialogPopup } from "../user-menu.styles";
import { DesktopTabList } from "./desktop-tab-list";
import { MobileTabNav } from "./mobile-tab-nav";
import { SettingsPanels } from "./settings-panels";
import type { SettingsTab } from "./tab-groups";
import { visibleTabGroups } from "./tab-groups";

export interface UserSettingsDialogViewProps {
	user: UserMenuUser;
	settings: Settings;
	setSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
	isPremium: boolean | undefined;
	onSignOut: () => void;
	onOpenDeleteDialog: () => void;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	activeTab: SettingsTab["value"];
	visitedTabs: ReadonlySet<SettingsTab["value"]>;
	mobilePageOpen: boolean;
	selectTab: (value: SettingsTab["value"]) => void;
	openMobilePage: () => void;
	closeMobilePage: () => void;
	onReplayTour: () => void;
	isReplayingTour: boolean;
}

/** Purely presentational: the dialog chrome, the desktop/mobile tab UIs, and
 * the active settings panel. All navigation state and history-sync behavior
 * lives in `useSettingsDialogNav`, owned by the `UserSettingsDialog`
 * container. */
export function UserSettingsDialogView({
	user,
	settings,
	setSetting,
	isPremium,
	onSignOut,
	onOpenDeleteDialog,
	open,
	onOpenChange,
	activeTab,
	visitedTabs,
	mobilePageOpen,
	selectTab,
	openMobilePage,
	closeMobilePage,
	onReplayTour,
	isReplayingTour,
}: UserSettingsDialogViewProps) {
	const tagsEnabled = settings.enabledNodeCapabilities.includes("tags");
	const activeTabLabel = visibleTabGroups(tagsEnabled)
		.flatMap((group) => group.tabs)
		.find((tab) => tab.value === activeTab)
		?.label();

	return (
		<Dialog.Root open={open} onOpenChange={onOpenChange}>
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
						<MobileTabNav
							tagsEnabled={tagsEnabled}
							mobilePageOpen={mobilePageOpen}
							onSelectTab={(value) => {
								selectTab(value);
								openMobilePage();
							}}
						/>
						<DesktopTabList tagsEnabled={tagsEnabled} />
						<div
							className={`absolute inset-0 flex min-h-0 min-w-0 flex-1 flex-col sm:visible sm:relative sm:inset-auto sm:transition-none ${dialogPanelMotion({ phase: mobilePageOpen ? "enter" : "exit" })} ${
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
									onClick={closeMobilePage}
								>
									<ArrowLeftIcon size={18} weight="bold" />
								</button>
								<span className="truncate font-semibold">{activeTabLabel}</span>
							</div>
							<SettingsPanels
								visitedTabs={visitedTabs}
								settings={settings}
								setSetting={setSetting}
								user={user}
								isPremium={isPremium}
								onSignOut={onSignOut}
								onOpenDeleteDialog={onOpenDeleteDialog}
								onReplayTour={onReplayTour}
								isReplayingTour={isReplayingTour}
							/>
						</div>
					</Tabs.Root>
				</Dialog.Popup>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
