import { Checkbox as BaseCheckbox } from "@base-ui/react";
import { CheckIcon } from "@phosphor-icons/react/ssr";
import { cva } from "./cva.config";

const root = cva({
	base: [
		"flex size-[18px] shrink-0 items-center justify-center rounded-md border cursor-pointer outline-none",
		"border-ink/25 transition-colors duration-small-enter",
		"hover:border-danger",
		"focus-visible:ring-2 focus-visible:ring-danger/50",
		"data-checked:border-danger data-checked:bg-danger",
		"data-disabled:cursor-default data-disabled:opacity-40 data-disabled:hover:border-ink/25",
		"dark:border-surface/25 dark:hover:border-danger",
		"dark:data-disabled:hover:border-surface/25",
	],
});

// The checkmark pop is restrained delight (see the motion foundation
// README): it keeps the overshoot easing other UI motion doesn't use.
const indicator = cva({
	base: [
		"flex text-canvas transition-[transform,opacity] duration-small-enter ease-overshoot data-ending-style:duration-small-exit",
		"data-starting-style:scale-50 data-starting-style:opacity-0",
		"data-ending-style:scale-50 data-ending-style:opacity-0",
		"motion-reduce:transition-opacity motion-reduce:duration-immediate motion-reduce:data-ending-style:duration-immediate",
		"motion-reduce:data-starting-style:scale-100 motion-reduce:data-ending-style:scale-100",
	],
});

export function Checkbox({
	className,
	...props
}: React.ComponentProps<typeof BaseCheckbox.Root>) {
	return (
		<BaseCheckbox.Root className={root({ className })} {...props}>
			<BaseCheckbox.Indicator className={indicator()}>
				<CheckIcon size={12} weight="bold" />
			</BaseCheckbox.Indicator>
		</BaseCheckbox.Root>
	);
}
