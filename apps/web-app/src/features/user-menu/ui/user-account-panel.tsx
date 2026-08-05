import { Button } from "@cascade/ui/button";
import {
	DownloadSimpleIcon,
	SignOutIcon,
	TrashIcon,
} from "@phosphor-icons/react/ssr";
import { m } from "#/paraglide/messages.js";
import { useExportAccountData } from "@/features/account-data/client/use-account-data-export";
import {
	SettingsPageDescription,
	SettingsRow,
	SettingsSection,
} from "@/features/settings/ui/settings-panel";
import type { UserMenuUser } from "../model/user-menu.types";
import { Avatar } from "./avatar";

interface UserAccountPanelProps {
	user: UserMenuUser;
	isPremium: boolean | undefined;
	onSignOut: () => void;
	onOpenDeleteDialog: () => void;
}

export function UserAccountPanel({
	user,
	isPremium,
	onSignOut,
	onOpenDeleteDialog,
}: UserAccountPanelProps) {
	const { exportData, isExporting } = useExportAccountData();

	return (
		<>
			<SettingsPageDescription>
				{m.settings_account_description()}
			</SettingsPageDescription>
			<SettingsSection title={m.settings_profile_section()}>
				<div className="flex items-center gap-4 px-5 py-5">
					<Avatar user={user} className="size-14" isPremium={isPremium} />
					<div className="min-w-0">
						<div className="truncate font-semibold">{user.name}</div>
						<div className="truncate text-sm text-ink/60 dark:text-surface/60">
							{user.email}
						</div>
					</div>
				</div>
			</SettingsSection>
			<SettingsSection title={m.settings_session_section()}>
				<SettingsRow
					title={m.user_menu_sign_out()}
					description={m.settings_sign_out_description()}
				>
					<Button
						type="button"
						size="sm"
						variant="dark"
						onClick={onSignOut}
						icon={<SignOutIcon size={14} weight="bold" />}
					>
						{m.user_menu_sign_out()}
					</Button>
				</SettingsRow>
			</SettingsSection>
			<SettingsSection title={m.settings_data_section()}>
				<SettingsRow
					title={m.settings_export_button()}
					description={m.settings_export_description()}
				>
					<Button
						type="button"
						size="sm"
						variant="dark"
						onClick={exportData}
						disabled={isExporting}
						icon={<DownloadSimpleIcon size={14} weight="bold" />}
					>
						{isExporting ? m.settings_exporting() : m.settings_export_button()}
					</Button>
				</SettingsRow>
			</SettingsSection>
			<SettingsSection title={m.settings_danger_zone()} tone="danger">
				<SettingsRow
					title={m.user_menu_delete_account()}
					description={m.settings_delete_account_description()}
				>
					<Button
						type="button"
						size="sm"
						variant="danger"
						onClick={onOpenDeleteDialog}
						icon={<TrashIcon size={14} weight="bold" />}
					>
						{m.user_menu_delete_account()}
					</Button>
				</SettingsRow>
			</SettingsSection>
		</>
	);
}
