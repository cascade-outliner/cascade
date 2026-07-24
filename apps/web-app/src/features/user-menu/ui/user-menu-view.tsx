import type { Settings } from "@/features/settings/model/settings.schema";
import { TreeHistoryDialog } from "@/features/tree-history/ui/tree-history-dialog";
import { KeyboardShortcutsDialog } from "../../keyboard-shortcuts/ui/keyboard-shortcuts-dialog";
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
	treeHistoryOpen: boolean;
	onTreeHistoryOpenChange: (open: boolean) => void;
	onOpenTreeHistory: () => void;
	keyboardShortcutsOpen: boolean;
	onKeyboardShortcutsOpenChange: (open: boolean) => void;
	onOpenKeyboardShortcuts: () => void;
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
	keyboardShortcutsOpen,
	onKeyboardShortcutsOpenChange,
	onOpenKeyboardShortcuts,
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
				onOpenKeyboardShortcuts={onOpenKeyboardShortcuts}
				onSignOut={onSignOut}
			/>
			<TreeHistoryDialog
				open={treeHistoryOpen}
				onOpenChange={onTreeHistoryOpenChange}
			/>
			<KeyboardShortcutsDialog
				open={keyboardShortcutsOpen}
				onOpenChange={onKeyboardShortcutsOpenChange}
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
