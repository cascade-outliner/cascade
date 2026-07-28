import { cva } from "@cascade/ui/cva.config";

export const historyDialogPopup = cva({
	base: "fixed top-1/2 left-1/2 z-50 flex h-[min(850px,calc(100vh-1rem))] w-[min(1200px,calc(100vw-1rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-ink/10 bg-white text-ink shadow-2xl outline-none dark:border-surface/15 dark:bg-ink dark:text-surface",
});

export const historyListItem = cva({
	base: "absolute left-0 flex w-full cursor-pointer flex-col items-start gap-0.5 border-ink/5 border-b px-4 py-2 text-left outline-none hover:bg-ink/5 dark:border-surface/10 dark:hover:bg-surface/10",
	variants: {
		selected: {
			true: "bg-ink/5 dark:bg-surface/10",
		},
	},
});
