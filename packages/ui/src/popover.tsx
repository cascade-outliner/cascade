import { Popover as BasePopover } from "@base-ui/react";
import { cva } from "./cva.config";
import { overlayPopupMotion } from "./overlay-motion";

const popup = cva({
	base: [
		"origin-(--transform-origin) rounded-lg border border-ink/10 bg-white p-3 text-ink",
		"shadow-lg shadow-ink/15 outline-none",
		overlayPopupMotion,
		"dark:border-surface/10 dark:bg-ink dark:text-surface",
	],
});

export const Popover = BasePopover.Root;

const trigger = cva({ base: "outline-none" });

export function PopoverTrigger({
	className,
	...props
}: React.ComponentProps<typeof BasePopover.Trigger>) {
	return <BasePopover.Trigger className={trigger({ className })} {...props} />;
}

export function PopoverContent({
	className,
	anchor,
	...props
}: React.ComponentProps<typeof BasePopover.Popup> & {
	anchor?: React.ComponentProps<typeof BasePopover.Positioner>["anchor"];
}) {
	return (
		<BasePopover.Portal>
			<BasePopover.Positioner
				className="z-50 outline-none"
				sideOffset={6}
				anchor={anchor}
			>
				<BasePopover.Popup className={popup({ className })} {...props} />
			</BasePopover.Positioner>
		</BasePopover.Portal>
	);
}
