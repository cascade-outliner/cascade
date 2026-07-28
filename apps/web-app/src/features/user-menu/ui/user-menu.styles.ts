import { cva } from "@cascade/ui/cva.config";

export const avatarTrigger = cva({
	base: [
		"flex size-12 cursor-pointer items-center justify-center rounded-full border border-ink/10 bg-white text-ink shadow-md shadow-ink/15 outline-none select-none",
		"hover:bg-surface/70 focus-visible:ring-2 focus-visible:ring-danger/50 data-popup-open:bg-surface/70",
		"dark:border-surface/15 dark:bg-ink dark:text-surface dark:hover:bg-ink dark:data-popup-open:bg-ink",
	],
});

export const menuPopup = cva({
	base: [
		"min-w-40 rounded-lg border border-ink/10 bg-white p-1 text-ink dark:border-surface/15 dark:bg-ink dark:text-surface",
		"shadow-lg shadow-ink/15",
		"outline-none",
	],
});

export const menuItem = cva({
	base: [
		"flex cursor-pointer items-center gap-2 rounded-md px-3 py-1.5 text-sm outline-none",
		"data-highlighted:bg-surface/70 data-disabled:cursor-default data-disabled:opacity-40 dark:data-highlighted:bg-surface/20",
	],
});

export const tabTrigger = cva({
	base: [
		"flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-ink/60 outline-none",
		"transition-colors duration-150",
		"hover:bg-surface/70 hover:text-ink focus-visible:ring-2 focus-visible:ring-danger/50 data-active:bg-surface data-active:font-medium data-active:text-ink",
		"dark:text-surface/60 dark:hover:bg-surface/10 dark:hover:text-surface dark:data-active:bg-surface/15 dark:data-active:text-surface",
	],
});

export const settingsDialogPopup = cva({
	base: [
		"fixed inset-0 z-50 flex h-dvh w-full flex-col overflow-hidden border-0 bg-white text-ink shadow-lg shadow-ink/15 outline-none",
		"sm:inset-auto sm:top-1/2 sm:left-1/2 sm:h-[min(90vh,54rem)] sm:w-[calc(100%-3rem)] sm:max-w-6xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl sm:border sm:border-ink/10 sm:dark:border-surface/15",
		"dark:bg-ink dark:text-surface",
	],
});

export const settingsPanel = cva({
	base: "absolute inset-0 overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-8",
});

export const iconButton = cva({
	base: "cursor-pointer rounded-md p-1 outline-none transition-colors duration-150 hover:bg-surface/70 focus-visible:ring-2 focus-visible:ring-danger/50 dark:hover:bg-surface/20",
});

export const alertPopup = cva({
	base: "fixed top-1/2 left-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-lg border border-ink/10 bg-white p-6 text-ink shadow-lg shadow-ink/15 outline-none dark:border-surface/15 dark:bg-ink dark:text-surface",
});

/** External "quick link" rows in the general settings tab. */
export const quickLinkItem = cva({
	base: "flex cursor-pointer items-center justify-between gap-4 px-5 py-4 text-sm outline-none hover:bg-surface/70 focus-visible:ring-2 focus-visible:ring-danger/50 dark:hover:bg-surface/10",
});
