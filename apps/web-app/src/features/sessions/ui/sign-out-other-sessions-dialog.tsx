import { AlertDialog } from "@base-ui/react";
import { Button } from "@cascade/ui/button";
import {
	dialogBackdropMotion,
	dialogPopupMotion,
} from "@cascade/ui/dialog-motion";
import { SignOutIcon } from "@phosphor-icons/react/ssr";
import { m } from "#/paraglide/messages.js";
import { alertPopup } from "@/features/user-menu/ui/user-menu.styles";

interface SignOutOtherSessionsDialogProps {
	disabled: boolean;
	isRevoking: boolean;
	onConfirm: () => void;
}

export function SignOutOtherSessionsDialog({
	disabled,
	isRevoking,
	onConfirm,
}: SignOutOtherSessionsDialogProps) {
	return (
		<AlertDialog.Root>
			<AlertDialog.Trigger
				render={
					<Button
						type="button"
						size="sm"
						variant="danger"
						disabled={disabled}
						icon={<SignOutIcon size={14} weight="bold" />}
					/>
				}
			>
				{m.security_sign_out_others()}
			</AlertDialog.Trigger>
			<AlertDialog.Portal>
				<AlertDialog.Backdrop className={dialogBackdropMotion()} />
				<AlertDialog.Popup className={`${alertPopup()} ${dialogPopupMotion()}`}>
					<AlertDialog.Title className="text-lg font-semibold">
						{m.security_sign_out_others()}
					</AlertDialog.Title>
					<AlertDialog.Description className="mt-2 text-sm">
						{m.security_sign_out_others_confirm()}
					</AlertDialog.Description>
					<div className="mt-6 flex justify-end gap-2">
						<AlertDialog.Close
							disabled={isRevoking}
							render={<Button type="button" size="sm" variant="dark" />}
						>
							{m.user_menu_cancel()}
						</AlertDialog.Close>
						<AlertDialog.Close
							render={
								<Button
									type="button"
									size="sm"
									variant="danger"
									disabled={isRevoking}
									onClick={onConfirm}
								/>
							}
						>
							{isRevoking
								? m.security_signing_out_others()
								: m.security_sign_out_others()}
						</AlertDialog.Close>
					</div>
				</AlertDialog.Popup>
			</AlertDialog.Portal>
		</AlertDialog.Root>
	);
}
