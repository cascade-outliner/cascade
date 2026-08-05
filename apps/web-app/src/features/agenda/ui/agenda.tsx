import { Dialog } from "@base-ui/react";
import { TreeSkeleton } from "@cascade/outliner/tree-skeleton";
import { Checkbox } from "@cascade/ui/checkbox";
import {
	dialogBackdropMotion,
	dialogPopupMotion,
} from "@cascade/ui/dialog-motion";
import { CalendarIcon, XIcon } from "@phosphor-icons/react/ssr";
import { Suspense, useId, useState } from "react";
import { m } from "#/paraglide/messages.js";
import { navLink } from "@/app/app-header.styles";
import { AgendaPanelContent } from "./agenda-panel-content";

export function Agenda() {
	const [open, setOpen] = useState(false);
	const [hideCompleted, setHideCompleted] = useState(true);
	const hideCompletedId = useId();

	return (
		<Dialog.Root open={open} onOpenChange={setOpen}>
			<Dialog.Trigger aria-label={m.header_agenda_link()} className={navLink()}>
				<CalendarIcon size={20} weight="bold" />
			</Dialog.Trigger>
			<Dialog.Portal>
				<Dialog.Backdrop className={dialogBackdropMotion()} />
				<Dialog.Popup
					className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col overflow-hidden bg-white text-ink shadow-2xl outline-none dark:bg-ink dark:text-surface ${dialogPopupMotion({ variant: "drawer-right" })}`}
				>
					<header className="flex items-center justify-between gap-4 border-ink/10 border-b px-5 py-4 dark:border-surface/15">
						<Dialog.Title className="font-serif text-xl italic">
							{m.agenda_heading()}
						</Dialog.Title>
						<div className="flex shrink-0 items-center gap-3">
							<label
								htmlFor={hideCompletedId}
								className="flex items-center gap-2 text-sm text-muted dark:text-surface/60"
							>
								<Checkbox
									id={hideCompletedId}
									aria-label={m.agenda_hide_completed_toggle()}
									checked={hideCompleted}
									onCheckedChange={(checked) =>
										setHideCompleted(checked === true)
									}
								/>
								{m.agenda_hide_completed_toggle()}
							</label>
							<Dialog.Close
								aria-label={m.agenda_close()}
								className="cursor-pointer rounded-md p-1 outline-none hover:bg-ink/5 dark:hover:bg-surface/10"
							>
								<XIcon size={18} weight="bold" />
							</Dialog.Close>
						</div>
					</header>
					<div className="min-h-0 flex-1 overflow-auto p-4">
						<Suspense fallback={<TreeSkeleton />}>
							<AgendaPanelContent
								hideCompleted={hideCompleted}
								onNavigate={() => setOpen(false)}
							/>
						</Suspense>
					</div>
				</Dialog.Popup>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
