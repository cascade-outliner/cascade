import { Dialog } from "@base-ui/react";
import { XIcon } from "@phosphor-icons/react/ssr";
import { m } from "#/paraglide/messages.js";
import { keyboardShortcutGroups } from "../model/keyboard-shortcuts-data";
import { KeyboardShortcutKeys } from "./keyboard-shortcut-keys";

export function KeyboardShortcutsDialog({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	return (
		<Dialog.Root open={open} onOpenChange={onOpenChange}>
			<Dialog.Portal>
				<Dialog.Backdrop className="fixed inset-0 z-50 bg-surface/20 backdrop-blur-sm" />
				<Dialog.Popup className="fixed top-1/2 left-1/2 z-50 flex max-h-[min(700px,calc(100vh-1rem))] w-[min(640px,calc(100vw-1rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-ink/10 bg-white text-ink shadow-2xl outline-none dark:border-surface/15 dark:bg-ink dark:text-surface">
					<header className="flex items-center justify-between border-ink/10 border-b px-5 py-4 dark:border-surface/15">
						<Dialog.Title className="font-semibold text-lg">
							{m.keyboard_shortcuts_title()}
						</Dialog.Title>
						<Dialog.Close
							aria-label={m.keyboard_shortcuts_close()}
							className="cursor-pointer rounded-md p-1 outline-none hover:bg-ink/5 dark:hover:bg-surface/10"
						>
							<XIcon size={18} weight="bold" />
						</Dialog.Close>
					</header>
					<div className="flex min-h-0 flex-1 flex-col gap-6 overflow-auto p-5">
						{keyboardShortcutGroups.map((group) => (
							<section key={group.title()}>
								<h2 className="mb-2 font-semibold text-ink/60 text-xs uppercase tracking-wide dark:text-surface/60">
									{group.title()}
								</h2>
								<ul className="flex flex-col gap-2">
									{group.entries.map((entry) => (
										<li
											key={entry.description()}
											className="flex items-center justify-between gap-4 text-sm"
										>
											<span>{entry.description()}</span>
											<KeyboardShortcutKeys hotkeys={entry.hotkeys} />
										</li>
									))}
								</ul>
							</section>
						))}
					</div>
				</Dialog.Popup>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
