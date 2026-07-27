import { cva } from "./cva.config";

export const dialogBackdropMotion = cva({
	base: [
		"fixed inset-0 z-50 bg-surface/20 backdrop-blur-sm",
		"transition-opacity duration-200 ease-out data-ending-style:duration-150",
		"data-starting-style:opacity-0 data-ending-style:opacity-0",
		"motion-reduce:duration-75 motion-reduce:data-ending-style:duration-75",
	],
});

export const dialogPopupMotion = cva({
	base: [
		"transition-[transform,opacity] duration-200 ease-out data-ending-style:duration-150",
		"data-starting-style:opacity-0 data-ending-style:opacity-0",
		"motion-reduce:transition-opacity motion-reduce:duration-75 motion-reduce:data-ending-style:duration-75",
	],
	variants: {
		variant: {
			centered: [
				"data-starting-style:scale-[0.98] data-ending-style:scale-[0.98]",
				"motion-reduce:data-starting-style:scale-100 motion-reduce:data-ending-style:scale-100",
			],
			fullscreen: [
				"data-starting-style:translate-y-3 data-ending-style:translate-y-3",
				"sm:data-starting-style:translate-y-0 sm:data-ending-style:translate-y-0 sm:data-starting-style:scale-[0.98] sm:data-ending-style:scale-[0.98]",
				"motion-reduce:data-starting-style:translate-y-0 motion-reduce:data-ending-style:translate-y-0 motion-reduce:sm:data-starting-style:scale-100 motion-reduce:sm:data-ending-style:scale-100",
			],
			"drawer-right": [
				"data-starting-style:translate-x-full data-ending-style:translate-x-full",
				"motion-reduce:data-starting-style:translate-x-0 motion-reduce:data-ending-style:translate-x-0",
			],
		},
	},
	defaultVariants: {
		variant: "centered",
	},
});
