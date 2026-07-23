import type { Settings } from "@/features/settings/model/settings.schema";
import type { UserMenuUser } from "../model/user-menu.types";
import { DeleteAccountDialog } from "./delete-account-dialog";
import { UserMenuTrigger } from "./user-menu-trigger";
import { UserSettingsDialog } from "./user-settings-dialog";

export interface UserMenuViewProps {
	user: UserMenuUser;
	settings: Settings;
	setSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
	settingsOpen: boolean;
	onSettingsOpenChange: (open: boolean) => void;
	onOpenSettings: () => void;
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
			<DeleteAccountDialog
				open={deleteDialogOpen}
				onOpenChange={onDeleteDialogOpenChange}
				onDeleteAccount={onDeleteAccount}
				isDeleting={isDeleting}
			/>
		</>
	);
}
