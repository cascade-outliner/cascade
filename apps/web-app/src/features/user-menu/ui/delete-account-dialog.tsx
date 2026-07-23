import { AlertDialog } from "@base-ui/react";
import { Button } from "@cascade/ui/button";
import { m } from "#/paraglide/messages.js";
import { alertPopup } from "./user-menu.styles";

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
							render={<Button type="button" size="sm" variant="dark" />}
						>
							{m.user_menu_cancel()}
						</AlertDialog.Close>
						<Button
							type="button"
							size="sm"
							variant="danger"
							onClick={onDeleteAccount}
							disabled={isDeleting}
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
