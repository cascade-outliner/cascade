import type { Settings } from "@/core/settings/settings-patch-schema";
import { TreeVersionHistoryModal } from "@/ui/nodes/tree-version-history";
import { DeleteAccountDialog } from "./DeleteAccountDialog";
import type { UserMenuUser } from "./types";
import { UserMenuTrigger } from "./UserMenuTrigger";
import { UserSettingsDialog } from "./UserSettingsDialog";

export interface UserMenuViewProps {
	user: UserMenuUser;
	settings: Settings;
	setSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
	settingsOpen: boolean;
	onSettingsOpenChange: (open: boolean) => void;
	onOpenSettings: () => void;
	treeHistoryOpen: boolean;
	onTreeHistoryOpenChange: (open: boolean) => void;
	onOpenTreeHistory: () => void;
	deleteDialogOpen: boolean;
	onDeleteDialogOpenChange: (open: boolean) => void;
	onOpenDeleteDialog: () => void;
	onSignOut: () => void;
	onDeleteAccount: () => void;
	isDeleting: boolean;
}

export function UserMenuView({
	user,
	settings,
	setSetting,
	settingsOpen,
	onSettingsOpenChange,
	onOpenSettings,
	treeHistoryOpen,
	onTreeHistoryOpenChange,
	onOpenTreeHistory,
	deleteDialogOpen,
	onDeleteDialogOpenChange,
	onOpenDeleteDialog,
	onSignOut,
	onDeleteAccount,
	isDeleting,
}: UserMenuViewProps) {
	return (
		<>
			<UserMenuTrigger
				user={user}
				onOpenSettings={onOpenSettings}
				onOpenTreeHistory={onOpenTreeHistory}
				onSignOut={onSignOut}
			/>
			<UserSettingsDialog
				user={user}
				settings={settings}
				setSetting={setSetting}
				open={settingsOpen}
				onOpenChange={onSettingsOpenChange}
				onSignOut={onSignOut}
				onOpenDeleteDialog={onOpenDeleteDialog}
			/>
			<TreeVersionHistoryModal
				open={treeHistoryOpen}
				onOpenChange={onTreeHistoryOpenChange}
			/>
			<DeleteAccountDialog
				open={deleteDialogOpen}
				onOpenChange={onDeleteDialogOpenChange}
				onDeleteAccount={onDeleteAccount}
				isDeleting={isDeleting}
			/>
		</>
	);
}
