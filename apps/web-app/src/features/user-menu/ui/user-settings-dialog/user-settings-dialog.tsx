import { useReplayOnboardingTour } from "@/features/onboarding/client/use-replay-onboarding-tour";
import { usePremiumStatus } from "@/features/premium/client/use-premium";
import type { UserSettingsDialogProps } from "./types";
import { useSettingsDialogNav } from "./use-settings-dialog-nav";
import { UserSettingsDialogView } from "./user-settings-dialog-view";

export function UserSettingsDialog({
	user,
	settings,
	setSetting,
	open,
	onOpenChange,
	onSignOut,
	onOpenDeleteDialog,
}: UserSettingsDialogProps) {
	const { data: premium } = usePremiumStatus();
	const nav = useSettingsDialogNav({ open, onOpenChange });
	const replayTour = useReplayOnboardingTour();

	return (
		<UserSettingsDialogView
			user={user}
			settings={settings}
			setSetting={setSetting}
			isPremium={premium?.isPremium}
			onSignOut={onSignOut}
			onOpenDeleteDialog={onOpenDeleteDialog}
			open={open}
			onOpenChange={nav.handleOpenChange}
			activeTab={nav.activeTab}
			visitedTabs={nav.visitedTabs}
			mobilePageOpen={nav.mobilePageOpen}
			selectTab={nav.selectTab}
			openMobilePage={nav.openMobilePage}
			closeMobilePage={nav.closeMobilePage}
			onReplayTour={() => {
				// Wait for the mutation before closing: it may need to add
				// sample nodes back, and the tour shouldn't start until they
				// actually exist.
				replayTour.mutate(undefined, {
					onSuccess: () => nav.handleOpenChange(false),
				});
			}}
			isReplayingTour={replayTour.isPending}
		/>
	);
}
