import { Menu } from "@base-ui/react";
import {
	ClockCounterClockwiseIcon,
	CrownIcon,
	GearIcon,
	SignOutIcon,
} from "@phosphor-icons/react/ssr";
import { useQuery } from "@tanstack/react-query";
import { m } from "#/paraglide/messages.js";
import { orpc } from "@/orpc/client";
import { Avatar } from "./Avatar";
import { avatarTrigger, menuItem, menuPopup } from "./styles";
import type { UserMenuUser } from "./types";

export interface UserMenuTriggerProps {
	user: UserMenuUser;
	onOpenSettings: () => void;
	onOpenTreeHistory: () => void;
	onSignOut: () => void;
}

export function UserMenuTrigger({
	user,
	onOpenSettings,
	onOpenTreeHistory,
	onSignOut,
}: UserMenuTriggerProps) {
	const { data: premium } = useQuery(orpc.premium.get.queryOptions());

	return (
		<Menu.Root>
			<Menu.Trigger
				aria-label={m.user_menu_trigger_label()}
				className={avatarTrigger()}
			>
				<Avatar
					user={user}
					className="size-10"
					isPremium={premium?.isPremium}
				/>
			</Menu.Trigger>
			<Menu.Portal>
				<Menu.Positioner
					className="z-50 outline-none"
					align="end"
					sideOffset={6}
				>
					<Menu.Popup className={menuPopup()}>
						<Menu.Item className={menuItem()} onClick={onOpenSettings}>
							<GearIcon size={14} weight="bold" />
							{m.user_menu_settings()}
						</Menu.Item>
						<Menu.Item className={menuItem()} onClick={onOpenTreeHistory}>
							<ClockCounterClockwiseIcon size={14} weight="bold" />
							{m.outliner_tree_version_history_trigger()}
							{!premium?.isPremium && (
								<CrownIcon
									size={12}
									weight="fill"
									className="ml-auto text-primary"
								/>
							)}
						</Menu.Item>
						<Menu.Item className={menuItem()} onClick={onSignOut}>
							<SignOutIcon size={14} weight="bold" />
							{m.user_menu_sign_out()}
						</Menu.Item>
					</Menu.Popup>
				</Menu.Positioner>
			</Menu.Portal>
		</Menu.Root>
	);
}
