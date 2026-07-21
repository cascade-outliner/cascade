import { cva } from "@cascade/ui/cva.config";

export const trigger = cva({
	base: [
		"inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium outline-none",
		"border-ink/15 text-muted hover:border-ink/30 hover:text-ink",
		"dark:border-surface/15 dark:text-surface/70 dark:hover:border-surface/30 dark:hover:text-surface",
		"data-popup-open:border-danger/30 data-popup-open:bg-danger/10 data-popup-open:text-danger",
		"focus-visible:ring-2 focus-visible:ring-danger/50",
	],
});

export const popup = cva({
	base: [
		"w-56 rounded-lg border border-ink/10 bg-white p-1 text-ink",
		"shadow-lg shadow-ink/15",
		"outline-none",
		"dark:border-surface/10 dark:bg-ink dark:text-surface",
	],
});

export const groupLabel = cva({
	base: "px-2.5 pt-2 pb-1 text-[10.5px] font-semibold uppercase tracking-wide text-muted/75 dark:text-surface/50",
});

export const menuItem = cva({
	base: [
		"flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-sm outline-none",
		"data-highlighted:bg-surface/70 dark:data-highlighted:bg-surface/20",
		"data-disabled:cursor-default data-disabled:opacity-50 data-disabled:hover:bg-transparent",
	],
});

export const calendarPopup = cva({
	base: [
		"rounded-lg border border-ink/10 bg-white p-3 text-ink",
		"shadow-lg shadow-ink/15 outline-none",
		"dark:border-surface/10 dark:bg-ink dark:text-surface",
	],
});

export const chip = cva({
	base: [
		"inline-flex shrink-0 items-center gap-1.5 rounded-full border py-1 pl-2.5 pr-1 text-[11.5px] font-medium tabular-nums",
		"border-accent/50 bg-accent/25 text-ink dark:border-accent/40 dark:bg-accent/20 dark:text-surface",
	],
});

// Same visual as the tag editor's option checkboxes, so toggles look the
// same wherever they appear.
export const checkbox = cva({
	base: "flex size-4 shrink-0 items-center justify-center rounded border",
	variants: {
		checked: {
			true: "border-danger bg-danger text-canvas",
			false: "border-ink/30 dark:border-surface/30",
		},
	},
});

// Shared by every removable filter chip's "✕" button.
export const removeChipButton = cva({
	base: "flex size-4 items-center justify-center rounded-full outline-none hover:bg-ink/10 focus-visible:ring-2 focus-visible:ring-danger/50 dark:hover:bg-surface/15",
});

export const clearAll = cva({
	base: "cursor-pointer text-xs font-medium text-muted underline decoration-ink/25 underline-offset-2 hover:text-ink hover:decoration-ink/50 dark:text-surface/60 dark:decoration-surface/25 dark:hover:text-surface dark:hover:decoration-surface/50",
});
