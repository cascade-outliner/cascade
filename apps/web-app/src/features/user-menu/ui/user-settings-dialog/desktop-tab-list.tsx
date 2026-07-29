import { Tabs } from "@base-ui/react";
import { tabTrigger } from "../user-menu.styles";
import { tabGroups } from "./tab-groups";

/** Large-screen tab list: a sidebar of settings sections, always visible
 * alongside the active panel. Hidden below `sm:`, where `MobileTabNav` is
 * the tab UI instead. */
export function DesktopTabList() {
	return (
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
	);
}
