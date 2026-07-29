import type { Settings } from "@/features/settings/model/settings.schema";
import type { UserMenuUser } from "../../model/user-menu.types";

export interface UserSettingsDialogProps {
	user: UserMenuUser;
	settings: Settings;
	setSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSignOut: () => void;
	onOpenDeleteDialog: () => void;
}
