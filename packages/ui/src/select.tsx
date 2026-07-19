import { Select as BaseSelect } from "@base-ui/react/select";
import { CaretUpDownIcon, CheckIcon } from "@phosphor-icons/react/ssr";
import { cva } from "./cva.config";

const trigger = cva({
	base: [
		"flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-sm outline-none",
		"hover:bg-ginger/70 focus-visible:ring-2 focus-visible:ring-redleather/50 data-popup-open:bg-ginger/70",
		"dark:hover:bg-ginger/20 dark:data-popup-open:bg-ginger/20",
	],
});

const popup = cva({
	base: [
		"origin-(--transform-origin) min-w-32 rounded-lg border border-dark-grey/10 bg-white p-1 text-dark-grey dark:border-ginger/15 dark:bg-dark-grey dark:text-ginger",
		"shadow-lg shadow-dark-grey/15 transition-[transform,opacity] duration-150 ease-out",
		"data-starting-style:scale-95 data-starting-style:opacity-0",
		"data-ending-style:scale-95 data-ending-style:opacity-0",
		"outline-none",
	],
});

const item = cva({
	base: [
		"flex cursor-pointer items-center gap-2 rounded-md px-3 py-1.5 text-sm outline-none",
		"data-highlighted:bg-ginger/70 dark:data-highlighted:bg-ginger/20",
	],
});

export interface SelectOption<Value extends string> {
	value: Value;
	label: string;
}

export interface SelectProps<Value extends string> {
	options: readonly SelectOption<Value>[];
	value: Value;
	onValueChange: (value: Value) => void;
	"aria-label"?: string;
	className?: string;
}

/**
 * A simple single-value picker over a fixed list of string options, styled to
 * match the rest of the design system. Labels are provided by the caller so
 * the component stays decoupled from any message catalog.
 */
export function Select<Value extends string>({
	options,
	value,
	onValueChange,
	"aria-label": ariaLabel,
	className,
}: SelectProps<Value>) {
	return (
		<BaseSelect.Root
			items={options.map((option) => ({
				value: option.value,
				label: option.label,
			}))}
			value={value}
			onValueChange={(next) => {
				if (next) onValueChange(next);
			}}
		>
			<BaseSelect.Trigger
				aria-label={ariaLabel}
				className={trigger({ className })}
			>
				<BaseSelect.Value />
				<BaseSelect.Icon>
					<CaretUpDownIcon size={12} weight="bold" />
				</BaseSelect.Icon>
			</BaseSelect.Trigger>
			<BaseSelect.Portal>
				{/* z-60: must outrank the app's z-50 dialogs/menus when nested inside one */}
				<BaseSelect.Positioner sideOffset={6} align="end" className="z-[60]">
					<BaseSelect.Popup className={popup()}>
						<BaseSelect.List>
							{options.map((option) => (
								<BaseSelect.Item
									key={option.value}
									value={option.value}
									className={item()}
								>
									<BaseSelect.ItemIndicator>
										<CheckIcon size={14} weight="bold" />
									</BaseSelect.ItemIndicator>
									<BaseSelect.ItemText>{option.label}</BaseSelect.ItemText>
								</BaseSelect.Item>
							))}
						</BaseSelect.List>
					</BaseSelect.Popup>
				</BaseSelect.Positioner>
			</BaseSelect.Portal>
		</BaseSelect.Root>
	);
}
