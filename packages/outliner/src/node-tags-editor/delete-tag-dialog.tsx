import { AlertDialog } from "@base-ui/react";
import { useState } from "react";
import { useOutlinerLabels } from "../labels-context";
import {
	dialogActions,
	dialogBackdrop,
	dialogCancelButton,
	dialogConfirmButton,
	dialogDescription,
	dialogPopup,
	dialogTitle,
} from "./styles";

interface DeleteTagDialogProps {
	/** Tag pending deletion, or null when the dialog is closed. */
	tagName: string | null;
	onOpenChange: (open: boolean) => void;
	onConfirm: (tagName: string) => void | Promise<void>;
}

export function DeleteTagDialog({
	tagName,
	onOpenChange,
	onConfirm,
}: DeleteTagDialogProps) {
	const labels = useOutlinerLabels();
	const [isDeleting, setIsDeleting] = useState(false);

	const handleConfirm = async () => {
		if (!tagName) return;
		setIsDeleting(true);
		try {
			await onConfirm(tagName);
		} finally {
			setIsDeleting(false);
			onOpenChange(false);
		}
	};

	return (
		<AlertDialog.Root open={tagName !== null} onOpenChange={onOpenChange}>
			<AlertDialog.Portal>
				<AlertDialog.Backdrop className={dialogBackdrop()} />
				<AlertDialog.Popup
					className={dialogPopup()}
					onClick={(e) => e.stopPropagation()}
				>
					<AlertDialog.Title className={dialogTitle()}>
						{labels.delete} &ldquo;{tagName}&rdquo;?
					</AlertDialog.Title>
					<AlertDialog.Description className={dialogDescription()}>
						{labels.deleteTagConfirmBody}
					</AlertDialog.Description>
					<div className={dialogActions()}>
						<AlertDialog.Close
							disabled={isDeleting}
							className={dialogCancelButton()}
						>
							{labels.cancel}
						</AlertDialog.Close>
						<button
							type="button"
							onClick={handleConfirm}
							disabled={isDeleting}
							className={dialogConfirmButton()}
						>
							{labels.delete}
						</button>
					</div>
				</AlertDialog.Popup>
			</AlertDialog.Portal>
		</AlertDialog.Root>
	);
}
