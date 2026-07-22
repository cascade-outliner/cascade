import { useRouteContext } from "@tanstack/react-router";
import { useState } from "react";
import { useSettings } from "@/ui/settings-context";
import { useDeleteAccount, useSignOut } from "./queries";
import { UserMenuView } from "./UserMenuView";

export function UserMenu() {
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [treeHistoryOpen, setTreeHistoryOpen] = useState(false);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const { settings, setSetting, saveSettings } = useSettings();
	const { user } = useRouteContext({ from: "/_authed" });

	const signOut = useSignOut();
	const deleteAccount = useDeleteAccount();

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
			deleteDialogOpen={deleteDialogOpen}
			onDeleteDialogOpenChange={setDeleteDialogOpen}
			onOpenDeleteDialog={() => setDeleteDialogOpen(true)}
			onSignOut={() => signOut.mutate()}
			onDeleteAccount={() => deleteAccount.mutate()}
			isDeleting={deleteAccount.isPending}
		/>
	);
}
