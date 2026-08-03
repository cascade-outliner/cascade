import { Dialog } from "@base-ui/react";
import { Button } from "@cascade/ui/button";
import {
	dialogBackdropMotion,
	dialogPopupMotion,
} from "@cascade/ui/dialog-motion";
import {
	ArrowRightIcon,
	MagnifyingGlassIcon,
	XIcon,
} from "@phosphor-icons/react/ssr";
import { m } from "#/paraglide/messages.js";
import { KeyboardShortcutKeys } from "@/features/keyboard-shortcuts/ui/keyboard-shortcut-keys";
import { useQuickOpen } from "@/features/quick-open/client/use-quick-open";
import {
	ResultAncestors,
	Snippet,
} from "@/features/quick-open/ui/quick-open-result";

const triggerClassName = [
	"flex h-9 cursor-pointer items-center gap-2 rounded-lg border px-2.5 text-sm outline-none",
	"border-ink/10 bg-white/70 text-ink/70 hover:bg-white hover:text-ink",
	"dark:border-surface/15 dark:bg-ink/70 dark:text-surface/70 dark:hover:bg-ink dark:hover:text-surface",
	"focus-visible:ring-2 focus-visible:ring-danger/50",
].join(" ");

const resultClassName = (isActive: boolean) =>
	[
		"group flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left outline-none",
		"hover:bg-ink/5 dark:hover:bg-surface/10",
		"focus-visible:ring-2 focus-visible:ring-danger/50",
		isActive ? "bg-ink/5 dark:bg-surface/10" : "",
	].join(" ");

export function QuickOpen() {
	const quickOpen = useQuickOpen();

	return (
		<Dialog.Root open={quickOpen.open} onOpenChange={quickOpen.onOpenChange}>
			<Dialog.Trigger
				className={triggerClassName}
				aria-label={m.quick_open_trigger()}
			>
				<MagnifyingGlassIcon size={16} weight="bold" />
				<span className="hidden sm:inline">{m.quick_open_trigger()}</span>
				<span className="hidden md:inline">
					<KeyboardShortcutKeys hotkeys={["Mod+K"]} />
				</span>
			</Dialog.Trigger>
			<Dialog.Portal>
				<Dialog.Backdrop className={dialogBackdropMotion()} />
				<Dialog.Popup
					initialFocus={quickOpen.inputRef}
					className={`fixed top-[min(18vh,9rem)] left-1/2 z-50 flex max-h-[min(620px,calc(100vh-1rem))] w-[min(680px,calc(100vw-1rem))] -translate-x-1/2 origin-top flex-col overflow-hidden rounded-xl border border-ink/10 bg-white text-ink shadow-2xl outline-none dark:border-surface/15 dark:bg-ink dark:text-surface ${dialogPopupMotion()}`}
				>
					<Dialog.Title className="sr-only">
						{m.quick_open_title()}
					</Dialog.Title>
					<div className="flex items-center gap-3 border-ink/10 border-b px-4 dark:border-surface/15">
						<MagnifyingGlassIcon
							size={20}
							weight="bold"
							className="shrink-0 opacity-50"
						/>
						<input
							ref={quickOpen.inputRef}
							type="search"
							value={quickOpen.query}
							onChange={(event) => quickOpen.onQueryChange(event.target.value)}
							onKeyDown={quickOpen.onInputKeyDown}
							placeholder={m.quick_open_placeholder()}
							aria-label={m.quick_open_input_label()}
							role="combobox"
							aria-autocomplete="list"
							aria-expanded={quickOpen.results.length > 0}
							aria-controls={quickOpen.listboxId}
							aria-activedescendant={
								quickOpen.results[quickOpen.activeIndex]
									? `${quickOpen.listboxId}-${quickOpen.results[quickOpen.activeIndex].id}`
									: undefined
							}
							className="h-14 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-ink/40 dark:placeholder:text-surface/40"
						/>
						<Dialog.Close
							aria-label={m.quick_open_close()}
							className="cursor-pointer rounded-md p-1 outline-none hover:bg-ink/5 focus-visible:ring-2 focus-visible:ring-danger/50 dark:hover:bg-surface/10"
						>
							<XIcon size={18} weight="bold" />
						</Dialog.Close>
					</div>

					<div className="min-h-32 overflow-auto p-2">
						{!quickOpen.canSearch ? (
							<p className="px-3 py-8 text-center text-ink/55 text-sm dark:text-surface/55">
								{m.quick_open_hint()}
							</p>
						) : quickOpen.isLoading ? (
							<p className="px-3 py-8 text-center text-ink/55 text-sm dark:text-surface/55">
								{m.quick_open_loading()}
							</p>
						) : quickOpen.isError ? (
							<div className="flex flex-col items-center gap-3 px-3 py-8 text-sm">
								<p>{m.quick_open_error()}</p>
								<Button
									type="button"
									size="sm"
									variant="dark"
									onClick={() => quickOpen.refetch()}
								>
									{m.error_generic_retry()}
								</Button>
							</div>
						) : quickOpen.results.length === 0 ? (
							<p className="px-3 py-8 text-center text-ink/55 text-sm dark:text-surface/55">
								{m.quick_open_empty()}
							</p>
						) : (
							<div
								id={quickOpen.listboxId}
								role="listbox"
								aria-label={m.quick_open_results()}
							>
								{quickOpen.results.map((result, index) => (
									<button
										key={result.id}
										id={`${quickOpen.listboxId}-${result.id}`}
										role="option"
										aria-selected={index === quickOpen.activeIndex}
										type="button"
										onMouseMove={() => quickOpen.setActiveIndex(index)}
										onClick={() => quickOpen.selectResult(result)}
										className={resultClassName(index === quickOpen.activeIndex)}
									>
										<span className="min-w-0 flex-1">
											<span className="block truncate text-sm">
												<Snippet result={result} />
											</span>
											<span className="mt-1 flex min-w-0 items-center gap-1 truncate text-ink/45 text-xs dark:text-surface/45">
												<ResultAncestors result={result} />
											</span>
										</span>
										<ArrowRightIcon
											size={16}
											weight="bold"
											className={`shrink-0 ${
												index === quickOpen.activeIndex
													? "opacity-50"
													: "opacity-0"
											}`}
										/>
									</button>
								))}
							</div>
						)}
					</div>
				</Dialog.Popup>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
