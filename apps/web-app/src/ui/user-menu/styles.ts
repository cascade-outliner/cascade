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
		"cursor-pointer border-b-2 border-transparent px-1 pb-2 text-sm text-ink/60 outline-none",
		"hover:text-ink data-active:border-danger data-active:text-ink",
		"dark:text-surface/60 dark:hover:text-surface dark:data-active:text-surface",
	],
});

export const stepperButton = cva({
	base: [
		"flex size-6 cursor-pointer items-center justify-center rounded-md text-ink outline-none",
		"hover:bg-surface/70 focus-visible:ring-2 focus-visible:ring-danger/50 disabled:cursor-default disabled:opacity-40",
		"dark:text-surface dark:hover:bg-surface/20",
	],
});

export const settingsDialogPopup = cva({
	base: [
		"fixed top-1/2 left-1/2 z-50 h-full w-full max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto border-0 bg-white p-6 text-ink shadow-lg shadow-ink/15 outline-none",
		"sm:h-auto sm:rounded-lg sm:border sm:border-ink/10 sm:dark:border-surface/15",
		"dark:bg-ink dark:text-surface",
	],
});

export const iconButton = cva({
	base: "cursor-pointer rounded-md p-1 outline-none hover:bg-surface/70 focus-visible:ring-2 focus-visible:ring-danger/50 dark:hover:bg-surface/20",
});

export const alertPopup = cva({
	base: "fixed top-1/2 left-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-lg border border-ink/10 bg-white p-6 text-ink shadow-lg shadow-ink/15 outline-none dark:border-surface/15 dark:bg-ink dark:text-surface",
});

/** External "quick link" rows in the general settings tab. */
export const quickLinkItem = cva({
	base: "flex cursor-pointer items-center gap-2 rounded-md px-3 py-1.5 text-sm outline-none hover:bg-surface/70 focus-visible:ring-2 focus-visible:ring-danger/50 dark:hover:bg-surface/20",
});

export const indentSizeInput = cva({
	base: "w-8 rounded-md bg-ink/10 py-0.5 text-center outline-none focus-visible:ring-2 focus-visible:ring-danger/50 dark:bg-surface/10",
});
