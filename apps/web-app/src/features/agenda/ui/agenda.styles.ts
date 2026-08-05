import { cva } from "@cascade/ui/cva.config";

export const sectionHeading = cva({
	base: "mb-2 text-sm font-semibold uppercase tracking-wide text-muted first:mt-0 mt-6 dark:text-surface/60",
});

export const dayHeading = cva({
	base: "mb-1 flex items-center gap-2 text-sm font-medium",
	variants: {
		kind: {
			overdue: "text-danger",
			today: "text-ink dark:text-surface",
			"this-week": "text-ink/80 dark:text-surface/80",
			upcoming: "text-ink/80 dark:text-surface/80",
		},
	},
});

export const row = cva({
	base: "flex items-center gap-2 rounded-md px-2 py-1.5 outline-none hover:bg-surface/70 focus-visible:ring-2 focus-visible:ring-danger/50 dark:hover:bg-surface/10",
});
