import { cva } from "@cascade/ui/cva.config";

/** A small color chip next to a status name in the picker, using the same
 * palette keys as `tagPill`'s `hue` variant. */
export const statusDot = cva({
	base: "size-2 shrink-0 rounded-full",
	variants: {
		hue: {
			amber: "bg-amber-500",
			emerald: "bg-emerald-500",
			sky: "bg-sky-500",
			violet: "bg-violet-500",
			rose: "bg-rose-500",
			teal: "bg-teal-500",
		},
	},
});
