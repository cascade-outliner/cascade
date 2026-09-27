import {
	borderWidth,
	colors,
	fontSize,
	radius,
	space,
} from "@cascade/theme/tokens.stylex";
import {
	CalendarBlankIcon,
	CaretLeftIcon,
	CaretRightIcon,
} from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";

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
}

/** `‹ Today ›`: jump to today's note, or step a day back or forward. */
export function DaySwitcher({
	label,
	active,
	onToday,
	onOlder,
	onNewer,
}: DaySwitcherProps) {
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
				<CalendarBlankIcon size={13} />
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
		</nav>
	);
}
