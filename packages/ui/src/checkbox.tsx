import { Checkbox as BaseCheckbox } from "@base-ui/react";
import { CheckIcon } from "@phosphor-icons/react/ssr";
import { cva } from "./cva.config";

const root = cva({
	base: [
		"flex size-[18px] shrink-0 items-center justify-center rounded-md border cursor-pointer outline-none",
		"border-ink/25 transition-colors duration-150",
		"hover:border-danger",
		"focus-visible:ring-2 focus-visible:ring-danger/50",
		"data-checked:border-danger data-checked:bg-danger",
		"data-disabled:cursor-default data-disabled:opacity-40 data-disabled:hover:border-ink/25",
		"dark:border-surface/25 dark:hover:border-danger",
		"dark:data-disabled:hover:border-surface/25",
	],
});

const indicator = cva({
	base: [
		"flex text-canvas transition-[transform,opacity] duration-150 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
		"data-starting-style:scale-50 data-starting-style:opacity-0",
		"data-ending-style:scale-50 data-ending-style:opacity-0",
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
