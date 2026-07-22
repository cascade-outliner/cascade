import { cva } from "@cascade/ui/cva.config";

export const dialogBackdrop = cva({
	base: "fixed inset-0 z-50 bg-surface/20 backdrop-blur-sm",
});

export const dialogPopup = cva({
	base: [
		"fixed inset-0 z-50 flex h-full w-full flex-col overflow-hidden border-0 bg-white text-ink shadow-lg shadow-ink/15 outline-none",
		"sm:top-1/2 sm:left-1/2 sm:h-[85vh] sm:max-h-[900px] sm:w-[92vw] sm:max-w-6xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-lg sm:border sm:border-ink/10 sm:dark:border-surface/15",
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

export const versionTimestamp = cva({
	base: "text-sm text-ink dark:text-surface",
});

/** Scrollable index of every version on the left; a fixed width so the
 * preview pane next to it has stable room to work with regardless of how
 * many entries are listed. */
export const listPane = cva({
	base: "flex w-72 shrink-0 flex-col overflow-y-auto border-ink/10 border-r dark:border-surface/15",
});

export const listRow = cva({
	base: [
		"absolute top-0 left-0 flex items-start w-full flex-col gap-0.5 border-ink/5 border-b px-4 py-3",
		"hover:bg-surface/70 has-[button:focus-visible]:ring-2 has-[button:focus-visible]:ring-danger/50 has-[button:focus-visible]:ring-inset",
		"dark:border-surface/10 dark:hover:bg-surface/10",
	],
	variants: {
		selected: {
			true: "bg-accent/25 dark:bg-accent/20",
			false: "",
		},
	},
});

/** The right-hand pane: selected version's header (timestamp + restore)
 * above a read-only preview of that version's content, as it looks in the
 * outliner. */
export const previewPane = cva({
	base: "flex min-w-0 flex-1 flex-col gap-3 overflow-hidden p-4",
});

export const previewPaneHeader = cva({
	base: "flex shrink-0 items-center justify-between gap-2",
});
