import { Dialog } from "@base-ui/react";
import { TreeSkeleton } from "@cascade/outliner/tree-skeleton";
import { Checkbox } from "@cascade/ui/checkbox";
import {
	dialogBackdropMotion,
	dialogPopupMotion,
} from "@cascade/ui/dialog-motion";
import { CalendarIcon, XIcon } from "@phosphor-icons/react/ssr";
import { Suspense, useEffect, useId, useState } from "react";
import { m } from "#/paraglide/messages.js";
import { dockItem } from "@/app/app-header.styles";
import { useMobileDockLayout } from "@/app/use-mobile-dock-layout";
import { AgendaPanelContent } from "./agenda-panel-content";

export function Agenda({
	isActive,
	onActiveChange,
}: {
	isActive: boolean;
	onActiveChange: (active: boolean) => void;
}) {
	const [open, setOpen] = useState(false);
	const [hideCompleted, setHideCompleted] = useState(true);
	const hideCompletedId = useId();
	const isMobileDock = useMobileDockLayout();

	const handleOpenChange = (next: boolean) => {
		setOpen(next);
		onActiveChange(next);
	};

	// A sibling panel (Quick Open) opened and claimed the dock — close ours.
	// Deliberately only reacts to `isActive` (the displacement signal), not
	// to `open`/`handleOpenChange`, which we set ourselves.
	// biome-ignore lint/correctness/useExhaustiveDependencies: see above
	useEffect(() => {
		if (!isActive && open) handleOpenChange(false);
	}, [isActive]);

	return (
		<Dialog.Root
			open={open}
			onOpenChange={handleOpenChange}
			modal={!isMobileDock}
		>
			<Dialog.Trigger
				aria-label={m.header_agenda_link()}
				className={dockItem()}
			>
				<CalendarIcon size={19} weight="bold" />
				<span className="text-[11px] font-semibold leading-none sm:hidden">
					{m.header_agenda_link()}
				</span>
			</Dialog.Trigger>
			<Dialog.Portal>
				<Dialog.Backdrop className={dialogBackdropMotion()} />
				<Dialog.Popup
					className={`fixed inset-x-3 top-3 bottom-24 z-50 flex flex-col overflow-hidden rounded-2xl border border-ink/10 bg-white text-ink shadow-lg shadow-ink/10 outline-none dark:border-surface/15 dark:bg-ink dark:text-surface dark:shadow-black/30 sm:inset-y-0 sm:inset-x-auto sm:right-0 sm:w-full sm:max-w-md sm:rounded-none sm:border-0 sm:shadow-2xl sm:dark:border-0 ${dialogPopupMotion({ variant: "drawer-right" })}`}
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
								onNavigate={() => handleOpenChange(false)}
							/>
						</Suspense>
					</div>
				</Dialog.Popup>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
