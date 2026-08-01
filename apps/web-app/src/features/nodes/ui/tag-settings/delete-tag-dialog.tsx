import { AlertDialog } from "@base-ui/react";
import type { TagSummary } from "@cascade/outliner/node-tags";
import { Button } from "@cascade/ui/button";
import {
	dialogBackdropMotion,
	dialogPopupMotion,
} from "@cascade/ui/dialog-motion";
import { m } from "#/paraglide/messages.js";
import { alertPopup } from "@/features/user-menu/ui/user-menu.styles";

interface DeleteTagDialogProps {
	tag: TagSummary | undefined;
	isDeleting: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirm: () => void;
}

export function DeleteTagDialog({
	tag,
	isDeleting,
	onOpenChange,
	onConfirm,
}: DeleteTagDialogProps) {
	return (
		<AlertDialog.Root open={tag !== undefined} onOpenChange={onOpenChange}>
			<AlertDialog.Portal>
				<AlertDialog.Backdrop className={dialogBackdropMotion()} />
				<AlertDialog.Popup className={`${alertPopup()} ${dialogPopupMotion()}`}>
					<AlertDialog.Title className="text-lg font-semibold">
						{m.settings_tags_delete_title()}
					</AlertDialog.Title>
					<AlertDialog.Description className="mt-2 text-sm">
						{tag &&
							m.settings_tags_delete_description({
								name: tag.name,
								count: tag.count,
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
							disabled={!tag || isDeleting}
							onClick={onConfirm}
						>
							{isDeleting
								? m.settings_tags_deleting()
								: m.settings_tags_delete()}
						</Button>
					</div>
				</AlertDialog.Popup>
			</AlertDialog.Portal>
		</AlertDialog.Root>
	);
}
