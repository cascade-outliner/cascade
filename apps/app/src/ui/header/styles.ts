import { cva } from "@cascade/ui/cva.config";

export const bar = cva({
	base: "flex shrink-0 items-center gap-3 border-b border-dark-grey/10 bg-super-ginger px-4 py-2 dark:border-ginger/15 dark:bg-dark-grey",
});

export const brand = cva({
	base: "flex shrink-0 items-center gap-2 rounded-md font-serif text-xl italic outline-none focus-visible:ring-2 focus-visible:ring-redleather/50",
});
