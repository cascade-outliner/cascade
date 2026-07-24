import { useRouteContext } from "@tanstack/react-router";
import { useState } from "react";
import { useSettings } from "@/features/settings/client/settings-context";
import { useKeyboardShortcutsHotkey } from "../../keyboard-shortcuts/ui/use-keyboard-shortcuts-hotkey";
import { useDeleteAccount, useSignOut } from "../client/use-account-actions";
import { UserMenuView } from "./user-menu-view";

export function UserMenu() {
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [treeHistoryOpen, setTreeHistoryOpen] = useState(false);
	const [keyboardShortcutsOpen, setKeyboardShortcutsOpen] = useState(false);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const { settings, setSetting, saveSettings } = useSettings();
	const { user } = useRouteContext({ from: "/_authed" });

	const signOut = useSignOut();
	const deleteAccount = useDeleteAccount();

	useKeyboardShortcutsHotkey(() => setKeyboardShortcutsOpen(true));

	if (!user) {
		return null;
	}

	return (
		<UserMenuView
			user={user}
			settings={settings}
			setSetting={setSetting}
			settingsOpen={settingsOpen}
			onSettingsOpenChange={(open) => {
				setSettingsOpen(open);
				if (!open) saveSettings();
			}}
			onOpenSettings={() => setSettingsOpen(true)}
			treeHistoryOpen={treeHistoryOpen}
			onTreeHistoryOpenChange={setTreeHistoryOpen}
			onOpenTreeHistory={() => setTreeHistoryOpen(true)}
			keyboardShortcutsOpen={keyboardShortcutsOpen}
			onKeyboardShortcutsOpenChange={setKeyboardShortcutsOpen}
			onOpenKeyboardShortcuts={() => setKeyboardShortcutsOpen(true)}
			deleteDialogOpen={deleteDialogOpen}
			onDeleteDialogOpenChange={setDeleteDialogOpen}
			onOpenDeleteDialog={() => setDeleteDialogOpen(true)}
			onSignOut={() => signOut.mutate()}
			onDeleteAccount={() => deleteAccount.mutate()}
			isDeleting={deleteAccount.isPending}
		/>
	);
}
