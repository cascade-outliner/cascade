import { Dialog } from "@base-ui/react";
import {
	dialogBackdropMotion,
	dialogPopupMotion,
} from "@cascade/ui/dialog-motion";
import { XIcon } from "@phosphor-icons/react/ssr";
import { m } from "#/paraglide/messages.js";
import { StatusSettingsPanel } from "./status-settings-panel";

/** A board's own status/column management, opened from the board view
 * itself rather than account-wide settings — each board owns its columns
 * independently (see per-board statuses). */
export function BoardSettingsDialog({
	boardId,
	open,
	onOpenChange,
}: {
	boardId: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	return (
		<Dialog.Root open={open} onOpenChange={onOpenChange}>
			<Dialog.Portal>
				<Dialog.Backdrop className={dialogBackdropMotion()} />
				<Dialog.Popup
					className={`fixed top-1/2 left-1/2 z-50 flex max-h-[min(700px,calc(100vh-1rem))] w-[min(560px,calc(100vw-1rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-ink/10 bg-white text-ink shadow-2xl outline-none dark:border-surface/15 dark:bg-ink dark:text-surface ${dialogPopupMotion()}`}
				>
					<header className="flex items-center justify-between border-ink/10 border-b px-5 py-4 dark:border-surface/15">
						<Dialog.Title className="font-semibold text-lg">
							{m.board_settings_title()}
						</Dialog.Title>
						<Dialog.Close
							aria-label={m.board_settings_close()}
							className="cursor-pointer rounded-md p-1 outline-none hover:bg-ink/5 dark:hover:bg-surface/10"
						>
							<XIcon size={18} weight="bold" />
						</Dialog.Close>
					</header>
					<div className="min-h-0 flex-1 overflow-auto">
						<StatusSettingsPanel boardId={boardId} />
					</div>
				</Dialog.Popup>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
