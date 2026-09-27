import {
	colors,
	fontSize,
	radius,
	shadow,
	space,
} from "@cascade/theme/tokens.stylex";
import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import {
	DayButton as BaseDayButton,
	type DayButtonProps,
	DayPicker,
} from "react-day-picker";

const styles = stylex.create({
	months: {
		position: "relative",
	},
	nav: {
		position: "absolute",
		top: 0,
		right: 0,
		display: "flex",
		gap: space["0.5"],
	},
	navButton: {
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		width: 28,
		height: 28,
		padding: 0,
		border: "none",
		borderRadius: radius.md,
		backgroundColor: {
			default: "transparent",
			":hover": colors.inkSubtle,
		},
		color: colors.muted,
		cursor: "pointer",
		":focus-visible": {
			outline: "none",
			boxShadow: shadow.focusRing,
		},
		":disabled": {
			opacity: 0.4,
			cursor: "default",
		},
	},
	caption: {
		display: "flex",
		alignItems: "center",
		height: 28,
		paddingInline: space["1.5"],
		marginBottom: space["2"],
	},
	captionLabel: {
		fontSize: fontSize["500"],
		fontWeight: 600,
		color: colors.ink,
	},
	grid: {
		borderCollapse: "collapse",
	},
	weekday: {
		width: 34,
		paddingBottom: space["1"],
		fontSize: fontSize["200"],
		fontWeight: 500,
		color: colors.muted,
	},
	day: {
		padding: space.px,
		textAlign: "center",
	},
	dayButton: {
		width: 32,
		height: 32,
		padding: 0,
		border: "none",
		borderRadius: radius.full,
		backgroundColor: {
			default: "transparent",
			":hover": colors.surface,
		},
		fontFamily: "inherit",
		fontSize: fontSize["400"],
		fontVariantNumeric: "tabular-nums",
		color: colors.ink,
		cursor: "pointer",
		":focus-visible": {
			outline: "none",
			boxShadow: shadow.focusRing,
		},
	},
	today: {
		color: colors.primary,
		fontWeight: 600,
	},
	outside: {
		color: colors.placeholder,
	},
	selected: {
		backgroundColor: {
			default: colors.primary,
			":hover": colors.primary,
		},
		color: colors.onPrimary,
		fontWeight: 600,
	},
});

const cls = (style: stylex.StyleXStyles) => stylex.props(style).className ?? "";

/** The library's button (it moves focus on arrow keys), styled by the day's modifiers. */
function DayButton({ modifiers, ...props }: DayButtonProps) {
	return (
		<BaseDayButton
			{...props}
			modifiers={modifiers}
			{...stylex.props(
				styles.dayButton,
				modifiers.today && styles.today,
				modifiers.outside && styles.outside,
				modifiers.selected && styles.selected,
			)}
		/>
	);
}

export interface CalendarProps {
	value?: Date;
	/** Called with the picked day, or `undefined` when the selected day is clicked again. */
	onChange: (date: Date | undefined) => void;
}

/** A month calendar for picking a single day, opening on `value`'s month. */
export function Calendar({ value, onChange }: CalendarProps) {
	return (
		<DayPicker
			mode="single"
			selected={value}
			defaultMonth={value}
			onSelect={onChange}
			showOutsideDays
			classNames={{
				months: cls(styles.months),
				nav: cls(styles.nav),
				button_previous: cls(styles.navButton),
				button_next: cls(styles.navButton),
				month_caption: cls(styles.caption),
				caption_label: cls(styles.captionLabel),
				month_grid: cls(styles.grid),
				weekday: cls(styles.weekday),
				day: cls(styles.day),
			}}
			components={{
				DayButton,
				Chevron: ({ orientation }) =>
					orientation === "left" ? (
						<CaretLeftIcon size={13} weight="bold" />
					) : (
						<CaretRightIcon size={13} weight="bold" />
					),
			}}
		/>
	);
}
