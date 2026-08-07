import { AlertDialog } from "@base-ui/react";
import type { StatusWithUsage } from "@cascade/outliner/node-statuses";
import { Button } from "@cascade/ui/button";
import {
	dialogBackdropMotion,
	dialogPopupMotion,
} from "@cascade/ui/dialog-motion";
import { m } from "#/paraglide/messages.js";
import { alertPopup } from "@/features/user-menu/ui/user-menu.styles";

interface DeleteStatusDialogProps {
	status: StatusWithUsage | undefined;
	isDeleting: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirm: () => void;
}

export function DeleteStatusDialog({
	status,
	isDeleting,
	onOpenChange,
	onConfirm,
}: DeleteStatusDialogProps) {
	return (
		<AlertDialog.Root open={status !== undefined} onOpenChange={onOpenChange}>
			<AlertDialog.Portal>
				<AlertDialog.Backdrop className={dialogBackdropMotion()} />
				<AlertDialog.Popup className={`${alertPopup()} ${dialogPopupMotion()}`}>
					<AlertDialog.Title className="text-lg font-semibold">
						{m.settings_statuses_delete_title()}
					</AlertDialog.Title>
					<AlertDialog.Description className="mt-2 text-sm">
						{status &&
							m.settings_statuses_delete_description({
								name: status.name,
								count: status.count,
							})}
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
							disabled={!status || isDeleting}
							onClick={onConfirm}
						>
							{isDeleting
								? m.settings_statuses_deleting()
								: m.settings_statuses_delete()}
						</Button>
					</div>
				</AlertDialog.Popup>
			</AlertDialog.Portal>
		</AlertDialog.Root>
	);
}
