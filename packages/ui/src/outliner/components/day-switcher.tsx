import { Popover } from "@base-ui/react/popover";
import {
	borderWidth,
	colors,
	fontSize,
	radius,
	shadow,
	space,
	zIndex,
} from "@cascade/theme/tokens.stylex";
import {
	CalendarBlankIcon,
	CaretLeftIcon,
	CaretRightIcon,
} from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import { useState } from "react";
import { Calendar } from "../../calendar/calendar";

const styles = stylex.create({
	group: {
		display: "inline-flex",
		alignItems: "center",
		gap: space["0.5"],
		padding: space["0.5"],
		borderRadius: radius.md,
		borderWidth: borderWidth.thin,
		borderStyle: "solid",
		borderColor: colors.border,
	},
	step: {
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		width: 26,
		height: 26,
		border: "none",
		padding: 0,
		borderRadius: radius.sm,
		backgroundColor: "transparent",
		color: colors.muted,
		cursor: "pointer",
		":hover": { backgroundColor: colors.inkSubtle },
	},
	today: {
		display: "flex",
		alignItems: "center",
		gap: space["1.5"],
		border: "none",
		paddingBlock: space["1"],
		paddingInline: space["2.5"],
		borderRadius: radius.sm,
		backgroundColor: {
			default: "transparent",
			":hover": colors.inkSubtle,
		},
		font: "inherit",
		fontSize: fontSize["300"],
		color: colors.ink,
		whiteSpace: "nowrap",
		cursor: "pointer",
	},
	positioner: {
		zIndex: zIndex.overlay,
	},
	popup: {
		padding: space["3"],
		borderRadius: radius.lg,
		borderWidth: borderWidth.thin,
		borderStyle: "solid",
		borderColor: colors.border,
		backgroundColor: colors.white,
		boxShadow: shadow.popup,
		outline: "none",
	},
	active: {
		backgroundColor: {
			default: colors.primaryMuted,
			":hover": colors.primaryMuted,
		},
		color: colors.primary,
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
		<nav aria-label="Daily nodes" {...stylex.props(styles.group)}>
			<button
				type="button"
				aria-label="Previous day"
				onClick={onOlder}
				{...stylex.props(styles.step)}
			>
				<CaretLeftIcon size={12} />
			</button>
			<button
				type="button"
				aria-current={active ? "page" : undefined}
				onClick={onToday}
				{...stylex.props(styles.today, active && styles.active)}
			>
				{label}
			</button>
			<button
				type="button"
				aria-label="Next day"
				onClick={onNewer}
				{...stylex.props(styles.step)}
			>
				<CaretRightIcon size={12} />
			</button>
			<Popover.Root open={open} onOpenChange={setOpen}>
				<Popover.Trigger aria-label="Pick a day" {...stylex.props(styles.step)}>
					<CalendarBlankIcon size={13} />
				</Popover.Trigger>
				<Popover.Portal>
					<Popover.Positioner
						sideOffset={8}
						{...stylex.props(styles.positioner)}
					>
						<Popover.Popup {...stylex.props(styles.popup)}>
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
