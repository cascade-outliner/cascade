import { AlertDialog } from "@base-ui/react";
import { Button } from "@cascade/ui/button";
import {
	dialogBackdropMotion,
	dialogPopupMotion,
} from "@cascade/ui/dialog-motion";
import { Input } from "@cascade/ui/input";
import { useEffect, useState } from "react";
import { m } from "#/paraglide/messages.js";
import { alertPopup } from "./user-menu.styles";

export interface DeleteAccountDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onDeleteAccount: () => void;
	isDeleting: boolean;
	userEmail: string;
}

export function DeleteAccountDialog({
	open,
	onOpenChange,
	onDeleteAccount,
	isDeleting,
	userEmail,
}: DeleteAccountDialogProps) {
	const [confirmText, setConfirmText] = useState("");

	// Reset the typed confirmation whenever the dialog is (re)opened, so a
	// prior confirmation can't linger and silently re-arm the delete button.
	useEffect(() => {
		if (open) setConfirmText("");
	}, [open]);

	const isConfirmed = confirmText.trim() === userEmail;

	return (
		<AlertDialog.Root open={open} onOpenChange={onOpenChange}>
			<AlertDialog.Portal>
				<AlertDialog.Backdrop className={dialogBackdropMotion()} />
				<AlertDialog.Popup className={`${alertPopup()} ${dialogPopupMotion()}`}>
					<AlertDialog.Title className="text-lg font-semibold">
						{m.user_menu_delete_account()}
					</AlertDialog.Title>
					<AlertDialog.Description className="mt-2 text-sm text-ink dark:text-surface">
						{m.user_menu_delete_confirm_body()}
						<p className="text-danger font-medium pt-4">
							{m.user_menu_delete_confirm_warning()}
						</p>
					</AlertDialog.Description>
					<div className="mt-4">
						<Input
							label={m.user_menu_delete_confirm_type_label({
								email: userEmail,
							})}
							value={confirmText}
							onChange={(event) => setConfirmText(event.target.value)}
							placeholder={userEmail}
							disabled={isDeleting}
							autoComplete="off"
							autoCorrect="off"
							autoCapitalize="off"
							spellCheck={false}
						/>
					</div>
					<div className="mt-6 flex justify-end gap-2">
						<AlertDialog.Close
							disabled={isDeleting}
							render={<Button type="button" size="sm" variant="dark" />}
						>
							{m.user_menu_cancel()}
						</AlertDialog.Close>
						<Button
							type="button"
							size="sm"
							variant="danger"
							onClick={onDeleteAccount}
							disabled={isDeleting || !isConfirmed}
						>
							{isDeleting
								? m.user_menu_deleting()
								: m.user_menu_delete_account()}
						</Button>
					</div>
				</AlertDialog.Popup>
			</AlertDialog.Portal>
		</AlertDialog.Root>
	);
}
