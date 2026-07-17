import { useRouteContext } from "@tanstack/react-router";
import { useState } from "react";
import { latestChangelogId } from "@/changelog";
import { useSettings } from "@/ui/settings-context";
import { useDeleteAccount, useSignOut } from "./queries";
import { UserMenuView } from "./UserMenuView";

export function UserMenu() {
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const { settings, setSetting, saveSettings } = useSettings();
	const { user } = useRouteContext({ from: "__root__" });
	const hasUnseenChangelog = settings.lastSeenChangelogId !== latestChangelogId;

	const signOut = useSignOut();
	const deleteAccount = useDeleteAccount();

	return (
		<UserMenuView
			user={user}
			settings={settings}
			setSetting={setSetting}
			hasUnseenChangelog={hasUnseenChangelog}
			settingsOpen={settingsOpen}
			onSettingsOpenChange={(open) => {
				setSettingsOpen(open);
				if (!open) saveSettings();
			}}
			onOpenSettings={() => setSettingsOpen(true)}
			onTabChange={(value) => {
				if (value === "changelog") {
					setSetting("lastSeenChangelogId", latestChangelogId);
				}
			}}
			deleteDialogOpen={deleteDialogOpen}
			onDeleteDialogOpenChange={setDeleteDialogOpen}
			onOpenDeleteDialog={() => setDeleteDialogOpen(true)}
			onSignOut={() => signOut.mutate()}
			onDeleteAccount={() => deleteAccount.mutate()}
			isDeleting={deleteAccount.isPending}
		/>
	);
}
