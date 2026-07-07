import { useId } from "react";
import { cva } from "./cva.config";

const field = cva({
	base: [
		"w-full rounded-md border border-dark-grey/15 bg-white px-3 py-2 text-sm text-dark-grey outline-none",
		"placeholder:text-dark-grey/40",
		"focus-visible:ring-2 focus-visible:ring-redleather/50",
		"dark:border-ginger/20 dark:bg-dark-grey dark:text-ginger dark:placeholder:text-ginger/40",
	],
});

export interface InputProps extends React.ComponentProps<"input"> {
	label: string;
}

export function Input({ label, id, className, ...props }: InputProps) {
	const autoId = useId();
	const inputId = id ?? autoId;

	return (
		<div className="flex flex-col gap-1.5 text-left">
			<label htmlFor={inputId} className="text-sm font-medium">
				{label}
			</label>
			<input id={inputId} className={field({ className })} {...props} />
		</div>
	);
}
