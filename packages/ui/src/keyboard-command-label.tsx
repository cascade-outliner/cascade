import { cva } from "./cva.config";

const label = cva({
	base: [
		"rounded border px-1 font-mono text-[9.5px]",
		"border-ink/20 bg-ink/5 dark:border-surface/20 dark:bg-surface/10",
	],
});

export function KeyboardCommandLabel({
	className,
	...props
}: React.ComponentProps<"kbd">) {
	return <kbd className={label({ className })} {...props} />;
}
