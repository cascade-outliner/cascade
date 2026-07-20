import { cva } from "@cascade/ui/cva.config";

export const search = cva({
	base: [
		"mb-1 flex w-64 items-center gap-2 rounded-md border px-2 py-1.5",
		"border-ink/15 focus-within:ring-2 focus-within:ring-danger/50",
		"dark:border-surface/15",
	],
});

export const charCount = cva({
	base: "shrink-0 text-[10.5px] tabular-nums",
	variants: {
		over: {
			true: "text-danger",
			false: "text-muted/60 dark:text-surface/50",
		},
	},
});

export const limitError = cva({
	base: "mb-1 px-1 text-[11px] text-danger",
});

export const input = cva({
	base: [
		"w-full bg-transparent text-sm outline-none",
		"text-ink placeholder:text-muted/60 dark:text-surface dark:placeholder:text-surface/40",
	],
});

export const optionRow = cva({
	base: [
		"group/option flex w-full items-center gap-1 rounded-md pr-1 pl-1 text-sm outline-none",
		"text-ink dark:text-surface hover:bg-surface/70 dark:hover:bg-surface/20",
	],
	variants: {
		// Keyboard-driven (arrow keys), independent of CSS :hover above, so a
		// stationary mouse resting over an option can't silently hijack what
		// Enter does while the user is typing something else.
		highlighted: {
			true: "bg-surface/70 dark:bg-surface/20",
			false: "",
		},
	},
});

export const optionButton = cva({
	base: "flex min-w-0 flex-1 cursor-pointer items-center gap-2 py-1.5 text-left outline-none",
});

export const checkbox = cva({
	base: "flex size-4 shrink-0 items-center justify-center rounded border",
	variants: {
		checked: {
			true: "border-danger bg-danger text-canvas",
			false: "border-ink/30 dark:border-surface/30",
		},
	},
});

export const usageCount = cva({
	base: "ml-auto shrink-0 text-[11px] tabular-nums text-muted/70 dark:text-surface/50",
});

export const deleteTagButton = cva({
	base: [
		"flex shrink-0 items-center justify-center rounded-md size-6 outline-none cursor-pointer",
		"opacity-0 group-hover/option:opacity-100 focus-visible:opacity-100",
		"text-muted/60 hover:bg-danger/10 hover:text-danger",
		"focus-visible:ring-2 focus-visible:ring-danger/50",
		"dark:text-surface/50 dark:hover:bg-danger/15",
	],
});

export const footer = cva({
	base: [
		"mt-1 flex gap-3 border-t px-1 pt-1.5 text-[10.5px]",
		"border-ink/10 text-muted/75 dark:border-surface/10 dark:text-surface/50",
	],
});

export const kbd = cva({
	base: [
		"rounded border px-1 font-mono text-[9.5px]",
		"border-ink/20 bg-ink/5 dark:border-surface/20 dark:bg-surface/10",
	],
});

export const dialogBackdrop = cva({
	base: "fixed inset-0 z-50 bg-surface/20 backdrop-blur-sm",
});

export const dialogPopup = cva({
	base: [
		"fixed top-1/2 left-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-lg border p-6 shadow-lg outline-none",
		"border-ink/10 bg-white text-ink shadow-ink/15",
		"dark:border-surface/15 dark:bg-ink dark:text-surface",
	],
});

export const dialogTitle = cva({
	base: "text-lg font-semibold",
});

export const dialogDescription = cva({
	base: "mt-2 text-sm text-ink dark:text-surface",
});

export const dialogActions = cva({
	base: "mt-6 flex justify-end gap-2",
});

export const dialogCancelButton = cva({
	base: [
		"cursor-pointer rounded-md px-3 py-1.5 text-sm outline-none",
		"hover:bg-surface/70 focus-visible:ring-2 focus-visible:ring-danger/50",
		"disabled:cursor-default disabled:opacity-40 dark:hover:bg-surface/20",
	],
});

export const dialogConfirmButton = cva({
	base: [
		"cursor-pointer rounded-md bg-danger px-3 py-1.5 text-sm text-canvas outline-none",
		"hover:bg-danger/90 focus-visible:ring-2 focus-visible:ring-danger/50",
		"disabled:cursor-default disabled:opacity-40",
	],
});
