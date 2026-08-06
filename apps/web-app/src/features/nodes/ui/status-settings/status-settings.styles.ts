import { cva } from "@cascade/ui/cva.config";

export const statusNameInput =
	"w-full rounded-md border border-ink/15 bg-white px-3 py-2 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-danger/50 dark:border-surface/20 dark:bg-ink dark:text-surface";

/** A palette swatch, both as the picker's buttons and as a status row's
 * color chip. Same palette keys as the outliner's status dot. */
export const colorSwatch = cva({
	base: "size-6 shrink-0 rounded-full border-2 transition-transform",
	variants: {
		hue: {
			amber: "bg-amber-500",
			emerald: "bg-emerald-500",
			sky: "bg-sky-500",
			violet: "bg-violet-500",
			rose: "bg-rose-500",
			teal: "bg-teal-500",
		},
		selected: {
			true: "border-ink scale-110 dark:border-surface",
			false: "border-transparent",
		},
	},
	defaultVariants: { selected: false },
});
