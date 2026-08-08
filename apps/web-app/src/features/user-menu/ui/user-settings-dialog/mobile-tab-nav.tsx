import { dialogPanelMotion } from "@cascade/ui/dialog-motion";
import { CaretRightIcon } from "@phosphor-icons/react/ssr";
import type { SettingsTab } from "./tab-groups";
import { visibleTabGroups } from "./tab-groups";

interface MobileTabNavProps {
	mobilePageOpen: boolean;
	onSelectTab: (value: SettingsTab["value"]) => void;
	tagsEnabled: boolean;
}

/** Small-screen tab list: a full-page menu of settings sections, replaced by
 * the selected panel (`SettingsPanels`) once a tab is chosen. Hidden on
 * `sm:` and up, where `DesktopTabList` is the tab UI instead. */
export function MobileTabNav({
	mobilePageOpen,
	onSelectTab,
	tagsEnabled,
}: MobileTabNavProps) {
	return (
		<div
			className={`absolute inset-0 overflow-y-auto bg-white px-4 py-5 sm:hidden dark:bg-surface/5 ${dialogPanelMotion({ phase: mobilePageOpen ? "exit" : "enter" })} ${
				mobilePageOpen
					? "pointer-events-none invisible -translate-x-1/4 opacity-0 motion-reduce:translate-x-0"
					: "visible translate-x-0 opacity-100"
			}`}
		>
			{visibleTabGroups(tagsEnabled).map((group) => (
				<section key={group.label()} className="mb-6 last:mb-0">
					<h2 className="mb-2 px-1 text-xs font-semibold tracking-wider text-ink/70 uppercase dark:text-surface/45">
						{group.label()}
					</h2>
					<div className="overflow-hidden rounded-xl border border-ink/10 bg-white dark:border-surface/15 dark:bg-surface/5">
						{group.tabs.map((tab) => {
							const Icon = tab.icon;
							return (
								<button
									type="button"
									key={tab.value}
									className="flex min-h-14 w-full cursor-pointer items-center gap-3 border-b border-ink/10 px-4 text-left outline-none transition-colors duration-small-enter last:border-b-0 hover:bg-surface/70 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-danger/50 dark:border-surface/15 dark:hover:bg-surface/10"
									onClick={() => onSelectTab(tab.value)}
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
	);
}
