import { Menu as BaseMenu } from "@base-ui/react";
import { cva } from "./cva.config";

const popup = cva({
	base: [
		"origin-(--transform-origin) min-w-40 rounded-lg border border-dark-grey/10 bg-white p-1 text-dark-grey",
		"shadow-lg shadow-dark-grey/15 transition-[transform,opacity] duration-150 ease-out",
		"data-starting-style:scale-95 data-starting-style:opacity-0",
		"data-ending-style:scale-95 data-ending-style:opacity-0",
		"outline-none",
	],
});

const item = cva({
	base: [
		"flex cursor-pointer items-center gap-2 rounded-md px-3 py-1.5 text-sm outline-none",
		"data-highlighted:bg-ginger/70 data-disabled:cursor-default data-disabled:opacity-40",
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

export const DropdownMenu = BaseMenu.Root;

const trigger = cva({ base: "outline-none" });

export function DropdownMenuTrigger({
	className,
	...props
}: React.ComponentProps<typeof BaseMenu.Trigger>) {
	return <BaseMenu.Trigger className={trigger({ className })} {...props} />;
}

export function DropdownMenuContent({
	className,
	align = "end",
	sideOffset = 6,
	...props
}: React.ComponentProps<typeof BaseMenu.Popup> &
	Pick<
		React.ComponentProps<typeof BaseMenu.Positioner>,
		"align" | "sideOffset"
	>) {
	return (
		<BaseMenu.Portal>
			<BaseMenu.Positioner
				className="z-50 outline-none"
				align={align}
				sideOffset={sideOffset}
			>
				<BaseMenu.Popup className={popup({ className })} {...props} />
			</BaseMenu.Positioner>
		</BaseMenu.Portal>
	);
}

export interface DropdownMenuItemProps
	extends React.ComponentProps<typeof BaseMenu.Item> {
	icon?: React.ReactNode;
	variant?: "default" | "destructive";
}

export function DropdownMenuItem({
	icon,
	variant,
	className,
	children,
	...props
}: DropdownMenuItemProps) {
	return (
		<BaseMenu.Item className={item({ variant, className })} {...props}>
			{icon}
			{children}
		</BaseMenu.Item>
	);
}
