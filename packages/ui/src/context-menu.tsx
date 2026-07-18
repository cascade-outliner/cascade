import { ContextMenu as BaseContextMenu } from "@base-ui/react";
import { CaretRightIcon } from "@phosphor-icons/react/ssr";
import { cva } from "./cva.config";

const popup = cva({
	base: [
		"origin-(--transform-origin) min-w-40 rounded-lg border border-dark-grey/10 bg-white p-1 text-dark-grey",
		"shadow-lg shadow-dark-grey/15 transition-[transform,opacity] duration-150 ease-out",
		"data-starting-style:scale-95 data-starting-style:opacity-0",
		"data-ending-style:scale-95 data-ending-style:opacity-0",
		"outline-none",
		"dark:border-ginger/10 dark:bg-dark-grey dark:text-ginger",
	],
});

const item = cva({
	base: [
		"flex cursor-pointer items-center gap-2 rounded-md px-3 py-1.5 text-sm outline-none",
		"data-highlighted:bg-ginger/70 dark:data-highlighted:bg-ginger/20",
		"data-disabled:cursor-default data-disabled:opacity-40",
	],
	variants: {
		variant: {
			default: "",
			destructive: "text-redleather",
		},
	},
	defaultVariants: {
		variant: "default",
	},
});

const separator = cva({ base: "my-1 h-px bg-dark-grey/10 dark:bg-ginger/10" });

export const ContextMenu = BaseContextMenu.Root;

const trigger = cva({ base: "outline-none" });

export function ContextMenuTrigger({
	className,
	...props
}: React.ComponentProps<typeof BaseContextMenu.Trigger>) {
	return (
		<BaseContextMenu.Trigger className={trigger({ className })} {...props} />
	);
}

export function ContextMenuContent({
	className,
	...props
}: React.ComponentProps<typeof BaseContextMenu.Popup>) {
	return (
		<BaseContextMenu.Portal>
			<BaseContextMenu.Positioner className="z-50 outline-none">
				<BaseContextMenu.Popup className={popup({ className })} {...props} />
			</BaseContextMenu.Positioner>
		</BaseContextMenu.Portal>
	);
}

export interface ContextMenuItemProps
	extends React.ComponentProps<typeof BaseContextMenu.Item> {
	icon?: React.ReactNode;
	variant?: "default" | "destructive";
}

export function ContextMenuItem({
	icon,
	variant,
	className,
	children,
	...props
}: ContextMenuItemProps) {
	return (
		<BaseContextMenu.Item className={item({ variant, className })} {...props}>
			{icon}
			{children}
		</BaseContextMenu.Item>
	);
}

export function ContextMenuSeparator({
	className,
	...props
}: React.ComponentProps<typeof BaseContextMenu.Separator>) {
	return (
		<BaseContextMenu.Separator
			className={separator({ className })}
			{...props}
		/>
	);
}

export const ContextMenuSub = BaseContextMenu.SubmenuRoot;

export interface ContextMenuSubTriggerProps
	extends React.ComponentProps<typeof BaseContextMenu.SubmenuTrigger> {
	icon?: React.ReactNode;
}

export function ContextMenuSubTrigger({
	icon,
	className,
	children,
	...props
}: ContextMenuSubTriggerProps) {
	return (
		<BaseContextMenu.SubmenuTrigger
			className={item({ className: `justify-between ${className ?? ""}` })}
			{...props}
		>
			<span className="flex items-center gap-2">
				{icon}
				{children}
			</span>
			<CaretRightIcon size={14} weight="bold" />
		</BaseContextMenu.SubmenuTrigger>
	);
}

export function ContextMenuSubContent({
	className,
	...props
}: React.ComponentProps<typeof BaseContextMenu.Popup>) {
	return (
		<BaseContextMenu.Portal>
			<BaseContextMenu.Positioner className="z-50">
				<BaseContextMenu.Popup className={popup({ className })} {...props} />
			</BaseContextMenu.Positioner>
		</BaseContextMenu.Portal>
	);
}
