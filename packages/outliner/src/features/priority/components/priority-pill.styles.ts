import { cva } from "@cascade/ui/cva.config";

/** Same pill geometry as tag/due-date pills, tinted per priority level so
 * "urgent" reads at a glance without opening the row. */
export const priorityPill = cva({
	base: [
		"inline-flex min-w-0 max-w-full items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap outline-none",
		"hover:ring-1 hover:ring-inset hover:ring-current/40",
	],
	variants: {
		level: {
			urgent:
				"border-danger/30 bg-danger/10 text-danger dark:border-danger/35 dark:bg-danger/15",
			high: "border-amber-600/30 bg-amber-600/10 text-amber-800 dark:border-amber-400/35 dark:bg-amber-400/15 dark:text-amber-300",
			medium:
				"border-sky-600/30 bg-sky-600/10 text-sky-700 dark:border-sky-400/35 dark:bg-sky-400/15 dark:text-sky-300",
			low: "border-ink/15 bg-transparent text-muted dark:border-surface/15 dark:text-surface/60",
		},
	},
});
