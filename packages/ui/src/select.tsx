import { Select as BaseSelect } from "@base-ui/react/select";
import { CaretUpDownIcon, CheckIcon } from "@phosphor-icons/react/ssr";
import { cva } from "./cva.config";

const trigger = cva({
	base: [
		"flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-sm outline-none",
		"hover:bg-surface/70 focus-visible:ring-2 focus-visible:ring-danger/50 data-popup-open:bg-surface/70",
		"dark:hover:bg-surface/20 dark:data-popup-open:bg-surface/20",
	],
});

const popup = cva({
	base: [
		"origin-(--transform-origin) min-w-32 rounded-lg border border-ink/10 bg-white p-1 text-ink dark:border-surface/15 dark:bg-ink dark:text-surface",
		"shadow-lg shadow-ink/15 transition-[transform,opacity] duration-150 ease-out",
		"data-starting-style:scale-95 data-starting-style:opacity-0",
		"data-ending-style:scale-95 data-ending-style:opacity-0",
		"outline-none",
	],
});

const item = cva({
	base: [
		"flex cursor-pointer items-center gap-2 rounded-md px-3 py-1.5 text-sm outline-none",
		"data-highlighted:bg-surface/70 dark:data-highlighted:bg-surface/20",
		"data-disabled:cursor-not-allowed data-disabled:opacity-50 data-disabled:hover:bg-transparent",
	],
});

export interface SelectOption<Value extends string> {
	value: Value;
	label: string;
	/** Renders the option but blocks selecting it, e.g. for a theme that needs
	 * a premium seat. */
	disabled?: boolean;
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
				{/* z-60: must outrank the app's z-50 dialogs/menus when nested inside one.
				alignItemWithTrigger (on by default) overlaps the popup with the trigger so
				the selected item lines up with it, ignoring sideOffset/align - and only
				falls back to plain anchored positioning for touch opens, so opening the
				same dropdown with a mouse vs. a finger renders it in two different places.
				We want one consistent, predictable position everywhere, so opt out. */}
				<BaseSelect.Positioner
					sideOffset={6}
					align="end"
					alignItemWithTrigger={false}
					className="z-[60]"
				>
					<BaseSelect.Popup className={popup()}>
						<BaseSelect.List>
							{options.map((option) => (
								<BaseSelect.Item
									key={option.value}
									value={option.value}
									disabled={option.disabled}
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
