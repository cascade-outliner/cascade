import { css, cva } from "@cascade/theme/css";
import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";
import {
	DayButton as BaseDayButton,
	type DayButtonProps,
	DayPicker,
} from "react-day-picker";

const styles = {
	months: css({
		position: "relative",
	}),
	nav: css({
		position: "absolute",
		top: 0,
		right: 0,
		display: "flex",
		gap: "0.5",
	}),
	navButton: css({
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		width: "28px",
		height: "28px",
		padding: 0,
		border: "none",
		borderRadius: "md",
		backgroundColor: {
			base: "transparent",
			_hover: "inkSubtle",
		},
		color: "muted",
		cursor: "pointer",
		_focusVisible: {
			outline: "none",
			boxShadow: "focusRing",
		},
		_disabled: {
			opacity: 0.4,
			cursor: "default",
		},
	}),
	caption: css({
		display: "flex",
		alignItems: "center",
		height: "28px",
		paddingInline: "1.5",
		marginBottom: "2",
	}),
	captionLabel: css({
		fontSize: "500",
		fontWeight: 600,
		color: "ink",
	}),
	grid: css({
		borderCollapse: "collapse",
	}),
	weekday: css({
		width: "34px",
		paddingBottom: "1",
		fontSize: "200",
		fontWeight: 500,
		color: "muted",
	}),
	day: css({
		padding: "px",
		textAlign: "center",
	}),
};

const dayButton = cva({
	base: {
		width: "32px",
		height: "32px",
		padding: 0,
		border: "none",
		borderRadius: "full",
		backgroundColor: {
			base: "transparent",
			_hover: "surface",
		},
		fontFamily: "inherit",
		fontSize: "400",
		fontVariantNumeric: "tabular-nums",
		color: "ink",
		cursor: "pointer",
		_focusVisible: {
			outline: "none",
			boxShadow: "focusRing",
		},
	},
	variants: {
		today: {
			true: {
				color: "primary",
				fontWeight: 600,
			},
		},
		outside: {
			true: {
				color: "placeholder",
			},
		},
		marked: {
			true: {
				position: "relative",
				_after: {
					content: '""',
					position: "absolute",
					bottom: "3px",
					left: "50%",
					width: "3px",
					height: "3px",
					marginLeft: "-1.5px",
					borderRadius: "full",
					backgroundColor: "currentColor",
				},
			},
		},
		selected: {
			true: {
				backgroundColor: {
					base: "primary",
					_hover: "primary",
				},
				color: "onPrimary",
				fontWeight: 600,
			},
		},
	},
});

/** The library's button (it moves focus on arrow keys), styled by the day's modifiers. */
function DayButton({ modifiers, ...props }: DayButtonProps) {
	return (
		<BaseDayButton
			{...props}
			modifiers={modifiers}
			className={dayButton({
				today: modifiers.today,
				outside: modifiers.outside,
				marked: modifiers.marked,
				selected: modifiers.selected,
			})}
		/>
	);
}

export interface CalendarProps {
	value?: Date;
	/** Called with the picked day, or `undefined` when the selected day is clicked again. */
	onChange: (date: Date | undefined) => void;
	/** Days to put a dot under, e.g. those with notes. */
	marked?: (date: Date) => boolean;
}

/** A month calendar for picking a single day, opening on `value`'s month. */
export function Calendar({ value, onChange, marked }: CalendarProps) {
	return (
		<DayPicker
			mode="single"
			selected={value}
			defaultMonth={value}
			onSelect={onChange}
			showOutsideDays
			modifiers={marked && { marked }}
			classNames={{
				months: styles.months,
				nav: styles.nav,
				button_previous: styles.navButton,
				button_next: styles.navButton,
				month_caption: styles.caption,
				caption_label: styles.captionLabel,
				month_grid: styles.grid,
				weekday: styles.weekday,
				day: styles.day,
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
