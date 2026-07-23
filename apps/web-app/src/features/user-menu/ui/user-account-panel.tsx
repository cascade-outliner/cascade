import { Button } from "@cascade/ui/button";
import { SignOutIcon, TrashIcon } from "@phosphor-icons/react/ssr";
import { m } from "#/paraglide/messages.js";
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
	return (
		<>
			<div className="flex items-center gap-3">
				<Avatar user={user} className="size-12" isPremium={isPremium} />
				<div className="min-w-0">
					<div className="truncate text-sm font-semibold">{user.name}</div>
					<div className="truncate text-sm text-ink/60 dark:text-surface/60">
						{user.email}
					</div>
				</div>
			</div>
			<div className="mt-4 flex items-center justify-between">
				<Button
					type="button"
					size="sm"
					variant="danger"
					onClick={onSignOut}
					icon={<SignOutIcon size={14} weight="bold" />}
				>
					{m.user_menu_sign_out()}
				</Button>
				<Button
					type="button"
					size="sm"
					variant="danger"
					onClick={onOpenDeleteDialog}
					icon={<TrashIcon size={14} weight="bold" />}
				>
					{m.user_menu_delete_account()}
				</Button>
			</div>
		</>
	);
}
