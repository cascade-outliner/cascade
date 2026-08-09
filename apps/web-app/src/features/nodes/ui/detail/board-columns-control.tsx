import { CircleDashedIcon } from "@phosphor-icons/react/ssr";
import { useState } from "react";
import { BoardSettingsDialog } from "#/features/nodes/ui/status-settings";
import { m } from "#/paraglide/messages.js";

/**
 * The board header's "manage columns" trigger plus its settings dialog,
 * self-contained so `NodeBoard` doesn't need to track the dialog's open
 * state itself.
 */
export function BoardColumnsControl({ boardId }: { boardId: string }) {
	const [open, setOpen] = useState(false);

	return (
		<>
			<div className="mb-4 flex justify-end">
				<button
					type="button"
					onClick={() => setOpen(true)}
					className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-xs font-medium text-muted outline-none hover:bg-ink/5 hover:text-ink focus-visible:ring-2 focus-visible:ring-accent/50 dark:hover:bg-surface/10 dark:hover:text-surface"
				>
					<CircleDashedIcon size={14} weight="bold" />
					{m.board_manage_columns()}
				</button>
			</div>
			<BoardSettingsDialog
				boardId={boardId}
				open={open}
				onOpenChange={setOpen}
			/>
		</>
	);
}
