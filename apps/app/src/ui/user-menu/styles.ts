import { cva } from "@cascade/ui/cva.config";

export const avatarTrigger = cva({
	base: [
		"flex size-12 cursor-pointer items-center justify-center rounded-full border border-dark-grey/10 bg-white text-dark-grey shadow-md shadow-dark-grey/15 outline-none select-none",
		"hover:bg-ginger/70 focus-visible:ring-2 focus-visible:ring-redleather/50 data-popup-open:bg-ginger/70",
		"dark:border-ginger/15 dark:bg-dark-grey dark:text-ginger dark:hover:bg-dark-grey dark:data-popup-open:bg-dark-grey",
	],
});

export const menuPopup = cva({
	base: [
		"min-w-40 rounded-lg border border-dark-grey/10 bg-white p-1 text-dark-grey dark:border-ginger/15 dark:bg-dark-grey dark:text-ginger",
		"shadow-lg shadow-dark-grey/15",
		"outline-none",
	],
});

export const menuItem = cva({
	base: [
		"flex cursor-pointer items-center gap-2 rounded-md px-3 py-1.5 text-sm outline-none",
		"data-highlighted:bg-ginger/70 data-disabled:cursor-default data-disabled:opacity-40 dark:data-highlighted:bg-ginger/20",
	],
});

export const tabTrigger = cva({
	base: [
		"cursor-pointer border-b-2 border-transparent px-1 pb-2 text-sm text-dark-grey/60 outline-none",
		"hover:text-dark-grey data-active:border-redleather data-active:text-dark-grey",
		"dark:text-ginger/60 dark:hover:text-ginger dark:data-active:text-ginger",
	],
});

export const stepperButton = cva({
	base: [
		"flex size-6 cursor-pointer items-center justify-center rounded-md text-dark-grey outline-none",
		"hover:bg-ginger/70 focus-visible:ring-2 focus-visible:ring-redleather/50 disabled:cursor-default disabled:opacity-40",
		"dark:text-ginger dark:hover:bg-ginger/20",
	],
});

export const settingsDialogPopup = cva({
	base: [
		"fixed inset-0 top-1/2 left-1/2 z-50 h-full w-full max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto border-0 bg-white p-6 text-dark-grey shadow-lg shadow-dark-grey/15 outline-none",
		"sm:right-auto sm:bottom-auto sm:h-auto sm:rounded-lg sm:border sm:border-dark-grey/10 sm:dark:border-ginger/15",
		"dark:bg-dark-grey dark:text-ginger",
	],
});

export const iconButton = cva({
	base: "cursor-pointer rounded-md p-1 outline-none hover:bg-ginger/70 focus-visible:ring-2 focus-visible:ring-redleather/50 dark:hover:bg-ginger/20",
});

/** The sign-out / delete-account rows in the "user" settings tab — same look, different top spacing. */
export const dangerMenuItem = cva({
	base: "flex cursor-pointer items-center gap-2 rounded-md px-3 py-1.5 text-sm text-redleather outline-none hover:bg-ginger/70 focus-visible:ring-2 focus-visible:ring-redleather/50 dark:hover:bg-ginger/20",
	variants: {
		spacing: {
			loose: "mt-4",
			tight: "mt-1",
		},
	},
});

export const alertPopup = cva({
	base: "fixed top-1/2 left-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-lg border border-dark-grey/10 bg-white p-6 text-dark-grey shadow-lg shadow-dark-grey/15 outline-none dark:border-ginger/15 dark:bg-dark-grey dark:text-ginger",
});

/** External "quick link" rows in the general settings tab. */
export const quickLinkItem = cva({
	base: "flex cursor-pointer items-center gap-2 rounded-md px-3 py-1.5 text-sm outline-none hover:bg-ginger/70 focus-visible:ring-2 focus-visible:ring-redleather/50 dark:hover:bg-ginger/20",
});

export const secondaryButton = cva({
	base: "cursor-pointer rounded-md px-3 py-1.5 text-sm outline-none hover:bg-ginger/70 focus-visible:ring-2 focus-visible:ring-redleather/50 disabled:cursor-default disabled:opacity-40 dark:hover:bg-ginger/20",
});

export const destructiveButton = cva({
	base: "cursor-pointer rounded-md bg-redleather px-3 py-1.5 text-sm text-super-ginger outline-none hover:bg-redleather/90 focus-visible:ring-2 focus-visible:ring-redleather/50 disabled:cursor-default disabled:opacity-40",
});

export const indentSizeInput = cva({
	base: "w-8 rounded-md bg-dark-grey/10 py-0.5 text-center outline-none focus-visible:ring-2 focus-visible:ring-redleather/50 dark:bg-ginger/10",
});
