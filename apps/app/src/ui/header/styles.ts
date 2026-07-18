import { cva } from "@cascade/ui/cva.config";

export const bar = cva({
	base: "flex shrink-0 items-center gap-3 border-b border-dark-grey/10 bg-super-ginger px-4 py-2 dark:border-ginger/15 dark:bg-dark-grey",
});

export const brand = cva({
	base: "flex shrink-0 items-center gap-1.5 rounded-md text-[1.05rem] font-semibold text-redleather outline-none focus-visible:ring-2 focus-visible:ring-redleather/50",
});

export const brandMark = cva({
	base: "size-5 shrink-0 rounded-[5px] bg-gradient-to-br from-redleather to-peach",
});

export const searchBox = cva({
	base: [
		"hidden min-w-0 flex-1 items-center gap-1.5 rounded-md border border-dark-grey/15 bg-white px-2.5 py-1 text-sm text-graphite outline-none sm:flex",
		"focus-within:border-redleather/40 focus-within:ring-2 focus-within:ring-redleather/50",
		"dark:border-ginger/15 dark:bg-dark-grey/60 dark:text-ginger/70",
	],
});

export const searchInput = cva({
	base: "w-full bg-transparent text-sm text-dark-grey outline-none placeholder:text-graphite/70 dark:text-ginger dark:placeholder:text-ginger/50",
});

export const iconButton = cva({
	base: [
		"flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-graphite outline-none",
		"hover:bg-ginger/70 hover:text-dark-grey focus-visible:ring-2 focus-visible:ring-redleather/50 data-popup-open:bg-ginger/70 data-popup-open:text-dark-grey",
		"dark:text-ginger/70 dark:hover:bg-ginger/20 dark:hover:text-ginger dark:data-popup-open:bg-ginger/20 dark:data-popup-open:text-ginger",
	],
});

export const menuPopup = cva({
	base: "min-w-48 rounded-lg border border-dark-grey/10 bg-white p-1 text-dark-grey shadow-lg shadow-dark-grey/15 outline-none dark:border-ginger/15 dark:bg-dark-grey dark:text-ginger",
});

export const menuItem = cva({
	base: [
		"flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-1.5 text-left text-sm outline-none",
		"data-highlighted:bg-ginger/70 dark:data-highlighted:bg-ginger/20",
		"data-disabled:cursor-default data-disabled:opacity-50 data-disabled:hover:bg-transparent",
	],
});

export const soonBadge = cva({
	base: "ml-auto shrink-0 rounded-full bg-dark-grey/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-graphite dark:bg-ginger/15 dark:text-ginger/70",
});

export const treeTabs = cva({
	base: "flex shrink-0 items-center gap-1 border-b border-dark-grey/10 bg-super-ginger px-4 dark:border-ginger/15 dark:bg-dark-grey",
});

export const treeTab = cva({
	base: "cursor-pointer rounded-t-md border-b-2 border-redleather px-3 py-1.5 text-sm font-medium text-dark-grey outline-none focus-visible:ring-2 focus-visible:ring-redleather/50 dark:text-ginger",
});

export const newTreeButton = cva({
	base: [
		"flex size-6 shrink-0 cursor-default items-center justify-center rounded-md text-graphite/50 outline-none",
		"dark:text-ginger/40",
	],
});
