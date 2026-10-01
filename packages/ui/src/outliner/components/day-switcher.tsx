import { Popover } from "@base-ui/react/popover";
import { css, cva } from "@cascade/theme/css";
import {
	CalendarBlankIcon,
	CaretLeftIcon,
	CaretRightIcon,
} from "@phosphor-icons/react";
import { useState } from "react";
import { Calendar } from "../../calendar/calendar";

const styles = {
	group: css({
		display: "inline-flex",
		alignItems: "center",
		gap: "0.5",
		padding: "0.5",
		borderRadius: "md",
		borderWidth: "thin",
		borderStyle: "solid",
		borderColor: "border",
	}),
	step: css({
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		width: "26px",
		height: "26px",
		border: "none",
		padding: 0,
		borderRadius: "sm",
		backgroundColor: "transparent",
		color: "muted",
		cursor: "pointer",
		_hover: { backgroundColor: "inkSubtle" },
	}),
	positioner: css({
		zIndex: "overlay",
	}),
	popup: css({
		padding: "3",
		borderRadius: "lg",
		borderWidth: "thin",
		borderStyle: "solid",
		borderColor: "border",
		backgroundColor: "white",
		boxShadow: "popup",
		outline: "none",
	}),
};

const today = cva({
	base: {
		display: "flex",
		alignItems: "center",
		gap: "1.5",
		border: "none",
		paddingBlock: "1",
		paddingInline: "2.5",
		borderRadius: "sm",
		backgroundColor: {
			base: "transparent",
			_hover: "inkSubtle",
		},
		font: "inherit",
		fontSize: "300",
		color: "ink",
		whiteSpace: "nowrap",
		cursor: "pointer",
	},
	variants: {
		active: {
			true: {
				backgroundColor: {
					base: "primaryMuted",
					_hover: "primaryMuted",
				},
				color: "primary",
			},
		},
	},
});

export interface DaySwitcherProps {
	/** "Today", or the short date of the day note being shown. */
	label: string;
	/** Today's note is the one open. */
	active: boolean;
	onToday: () => void;
	/** Step to the previous / next day. */
	onOlder: () => void;
	onNewer: () => void;
	/** The day shown, for the calendar to open on. */
	date?: Date;
	/** Jump to a day picked in the calendar. */
	onPick: (date: Date) => void;
	/** Days to dot in the calendar. */
	marked?: (date: Date) => boolean;
}

/** `‹ Today ›`: jump to today's note, or step a day back or forward. */
export function DaySwitcher({
	label,
	active,
	onToday,
	onOlder,
	onNewer,
	date,
	onPick,
	marked,
}: DaySwitcherProps) {
	const [open, setOpen] = useState(false);
	return (
		<nav aria-label="Daily nodes" className={styles.group}>
			<button
				type="button"
				aria-label="Previous day"
				onClick={onOlder}
				className={styles.step}
			>
				<CaretLeftIcon size={12} />
			</button>
			<button
				type="button"
				aria-current={active ? "page" : undefined}
				onClick={onToday}
				className={today({ active })}
			>
				{label}
			</button>
			<button
				type="button"
				aria-label="Next day"
				onClick={onNewer}
				className={styles.step}
			>
				<CaretRightIcon size={12} />
			</button>
			<Popover.Root open={open} onOpenChange={setOpen}>
				<Popover.Trigger aria-label="Pick a day" className={styles.step}>
					<CalendarBlankIcon size={13} />
				</Popover.Trigger>
				<Popover.Portal>
					<Popover.Positioner sideOffset={8} className={styles.positioner}>
						<Popover.Popup className={styles.popup}>
							<Calendar
								value={date}
								marked={marked}
								onChange={(picked) => {
									if (picked) {
										onPick(picked);
										setOpen(false);
									}
								}}
							/>
						</Popover.Popup>
					</Popover.Positioner>
				</Popover.Portal>
			</Popover.Root>
		</nav>
	);
}
