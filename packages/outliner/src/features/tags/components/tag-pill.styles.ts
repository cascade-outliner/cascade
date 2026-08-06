import { cva } from "@cascade/ui/cva.config";

export const MAX_VISIBLE_TAGS = 4;

export const tagPill = cva({
	base: "inline-flex min-w-0 max-w-full items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap outline-none",
	variants: {
		hue: {
			neutral:
				"border-ink/15 bg-transparent text-muted dark:border-surface/15 dark:text-surface/60",
			amber:
				"border-amber-600/30 bg-amber-600/10 text-amber-800 dark:border-amber-400/35 dark:bg-amber-400/15 dark:text-amber-300",
			emerald:
				"border-emerald-600/30 bg-emerald-600/10 text-emerald-700 dark:border-emerald-400/35 dark:bg-emerald-400/15 dark:text-emerald-300",
			sky: "border-sky-600/30 bg-sky-600/10 text-sky-700 dark:border-sky-400/35 dark:bg-sky-400/15 dark:text-sky-300",
			violet:
				"border-violet-600/30 bg-violet-600/10 text-violet-700 dark:border-violet-400/35 dark:bg-violet-400/15 dark:text-violet-300",
			rose: "border-rose-600/30 bg-rose-600/10 text-rose-700 dark:border-rose-400/35 dark:bg-rose-400/15 dark:text-rose-300",
			teal: "border-teal-600/30 bg-teal-600/10 text-teal-700 dark:border-teal-400/35 dark:bg-teal-400/15 dark:text-teal-300",
		},
		interactive: {
			true: [
				"outline-none hover:border-danger/50 hover:text-danger",
				"focus-visible:ring-2 focus-visible:ring-danger/50",
				"dark:hover:border-danger/40 dark:hover:text-danger",
			],
		},
		filterable: {
			true: [
				"cursor-pointer hover:ring-1 hover:ring-inset hover:ring-current/40",
				"focus-visible:ring-2 focus-visible:ring-danger/50",
			],
		},
	},
	defaultVariants: {
		hue: "neutral",
	},
});

export const addTagTrigger = cva({
	base: [
		"inline-flex shrink-0 items-center justify-center rounded-full border border-dashed size-5 outline-none",
		"border-ink/25 text-muted/70",
		"opacity-0 transition-opacity group-hover/node:opacity-100 group-focus-within/node:opacity-100 pointer-coarse:opacity-100 data-popup-open:opacity-100",
		"hover:border-danger/50 hover:text-danger hover:bg-danger/5",
		"focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-danger/50",
		"dark:border-surface/25 dark:text-surface/60 dark:hover:border-danger/40 dark:hover:text-danger",
	],
});
