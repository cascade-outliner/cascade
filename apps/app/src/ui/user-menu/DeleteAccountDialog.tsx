import { AlertDialog } from "@base-ui/react";
import { m } from "#/paraglide/messages.js";
import { alertPopup, destructiveButton, secondaryButton } from "./styles";

export interface DeleteAccountDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onDeleteAccount: () => void;
	isDeleting: boolean;
}

export function DeleteAccountDialog({
	open,
	onOpenChange,
	onDeleteAccount,
	isDeleting,
}: DeleteAccountDialogProps) {
	return (
		<AlertDialog.Root open={open} onOpenChange={onOpenChange}>
			<AlertDialog.Portal>
				<AlertDialog.Backdrop className="fixed inset-0 z-50 bg-surface/20 backdrop-blur-sm" />
				<AlertDialog.Popup className={alertPopup()}>
					<AlertDialog.Title className="text-lg font-semibold">
						{m.user_menu_delete_account()}
					</AlertDialog.Title>
					<AlertDialog.Description className="mt-2 text-sm text-ink dark:text-surface">
						{m.user_menu_delete_confirm_body()}
						<p className="text-danger font-medium pt-4">
							{m.user_menu_delete_confirm_warning()}
						</p>
					</AlertDialog.Description>
					<div className="mt-6 flex justify-end gap-2">
						<AlertDialog.Close
							disabled={isDeleting}
							className={secondaryButton()}
						>
							{m.user_menu_cancel()}
						</AlertDialog.Close>
						<button
							type="button"
							onClick={onDeleteAccount}
							disabled={isDeleting}
							className={destructiveButton()}
						>
							{isDeleting
								? m.user_menu_deleting()
								: m.user_menu_delete_account()}
						</button>
					</div>
				</AlertDialog.Popup>
			</AlertDialog.Portal>
		</AlertDialog.Root>
	);
}
