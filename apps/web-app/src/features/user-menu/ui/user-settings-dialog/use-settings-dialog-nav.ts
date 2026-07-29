import { useState } from "react";
import { useHistoryDepth } from "../../client/use-history-depth";
import type { SettingsTab } from "./tab-groups";

interface UseSettingsDialogNavOptions {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

/** Owns which settings tab is active, which tabs have ever been visited
 * (so `Tabs.Panel` only mounts panels the user has actually opened), and the
 * mobile push-navigation page state - plus wiring all of that into browser
 * history via `useHistoryDepth` so back/forward steps through the mobile
 * sub-page before dismissing the dialog. */
export function useSettingsDialogNav({
	open,
	onOpenChange,
}: UseSettingsDialogNavOptions) {
	const [activeTab, setActiveTab] = useState<SettingsTab["value"]>("general");
	const [visitedTabs, setVisitedTabs] = useState<
		ReadonlySet<SettingsTab["value"]>
	>(() => new Set(["general"]));
	const [mobilePageOpen, setMobilePageOpen] = useState(false);

	const selectTab = (value: SettingsTab["value"]) => {
		setVisitedTabs((current) => {
			if (current.has(value)) return current;
			return new Set(current).add(value);
		});
		setActiveTab(value);
	};

	const handleOpenChange = (nextOpen: boolean) => {
		if (!nextOpen) setMobilePageOpen(false);
		onOpenChange(nextOpen);
	};

	const historyDepth = open ? (mobilePageOpen ? 2 : 1) : 0;
	useHistoryDepth(historyDepth, (newDepth) => {
		if (newDepth < historyDepth) {
			if (mobilePageOpen) setMobilePageOpen(false);
			else handleOpenChange(false);
		} else if (newDepth > historyDepth) {
			if (!open) handleOpenChange(true);
			else if (!mobilePageOpen) setMobilePageOpen(true);
		}
	});

	return {
		activeTab,
		visitedTabs,
		mobilePageOpen,
		selectTab,
		handleOpenChange,
		openMobilePage: () => setMobilePageOpen(true),
		closeMobilePage: () => setMobilePageOpen(false),
	};
}
