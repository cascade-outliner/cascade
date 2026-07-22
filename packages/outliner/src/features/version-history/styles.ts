import { cva } from "@cascade/ui/cva.config";

export const dialogBackdrop = cva({
	base: "fixed inset-0 z-50 bg-surface/20 backdrop-blur-sm",
});

export const dialogPopup = cva({
	base: [
		"fixed inset-0 top-1/2 left-1/2 z-50 h-full w-full max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto border-0 bg-white p-6 text-ink shadow-lg shadow-ink/15 outline-none",
		"sm:right-auto sm:bottom-auto sm:h-auto sm:max-h-[80vh] sm:rounded-lg sm:border sm:border-ink/10 sm:dark:border-surface/15",
		"dark:bg-ink dark:text-surface",
	],
});

export const dialogTitle = cva({
	base: "text-lg font-semibold",
});

export const iconButton = cva({
	base: "cursor-pointer rounded-md p-1 outline-none hover:bg-surface/70 focus-visible:ring-2 focus-visible:ring-danger/50 dark:hover:bg-surface/20",
});

export const emptyState = cva({
	base: "py-8 text-center text-sm text-muted dark:text-surface/60",
});

export const versionRow = cva({
	base: "rounded-md border border-ink/10 dark:border-surface/15",
});

export const versionRowHeader = cva({
	base: "flex w-full items-center justify-between gap-2 px-3 py-2 text-sm",
});

export const versionTimestamp = cva({
	base: "text-ink dark:text-surface",
});

export const versionPreview = cva({
	base: "border-t border-ink/10 px-3 py-2 text-sm dark:border-surface/15",
});
