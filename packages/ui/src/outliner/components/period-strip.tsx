import { colors, fontSize, radius, space } from "@cascade/theme/tokens.stylex";
import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";

const DAY_WIDTH = 64;
const GAP = 6;

const styles = stylex.create({
	strip: {
		display: "flex",
		justifyContent: "center",
		gap: GAP,
		paddingBlock: space["2"],
	},
	day: {
		display: "flex",
		flexDirection: "column",
		alignItems: "center",
		gap: space["0.5"],
		width: DAY_WIDTH,
		paddingBlock: space["2"],
		borderWidth: 0,
		borderRadius: radius.lg,
		backgroundColor: "transparent",
		color: colors.ink,
		cursor: "pointer",
		position: "relative",
		transition: {
			default: "color 200ms",
			"@media (prefers-reduced-motion: reduce)": "none",
		},
	},
	arrow: {
		display: "flex",
		alignItems: "center",
		alignSelf: "center",
		padding: space["2"],
		borderWidth: 0,
		borderRadius: radius.md,
		backgroundColor: { default: "transparent", ":hover": colors.primaryMuted },
		color: colors.muted,
		cursor: "pointer",
	},
	selected: {
		color: colors.onPrimary,
	},
	// One fill that slides between days, instead of one per day.
	pill: {
		position: "absolute",
		top: 0,
		left: 0,
		width: DAY_WIDTH,
		height: "100%",
		borderRadius: radius.lg,
		backgroundColor: colors.primary,
		transition: {
			default: "transform 260ms cubic-bezier(0.2, 0, 0, 1)",
			"@media (prefers-reduced-motion: reduce)": "none",
		},
	},
	days: {
		position: "relative",
		display: "flex",
		gap: GAP,
	},
	name: {
		fontSize: fontSize["100"],
		fontWeight: 500,
		opacity: 0.7,
	},
	num: {
		fontSize: fontSize["500"],
		fontWeight: 600,
	},
	dot: {
		width: 4,
		height: 4,
		borderRadius: radius.full,
		backgroundColor: "currentColor",
	},
});

export interface StripItem {
	/** Small text above the number, e.g. the weekday. */
	name: string;
	/** The big text, e.g. the day of the month. */
	label: string;
	/** Put a dot under it, e.g. when it has notes. */
	marked?: boolean;
	onPick: () => void;
}

export interface PeriodStripProps {
	items: StripItem[];
	/** Index of the highlighted item. */
	selected: number;
	/** Step to the previous / next set of items. */
	onShift: (by: -1 | 1) => void;
	label?: string;
	/** Strips with the same kind slide their fill; a change of kind fades one strip into the other. */
	kind: string;
}

/** `Mon 21 … Sun 27`: a row of days (or months, or years) to jump between, with arrows to page through them. */
export function PeriodStrip({
	items,
	selected,
	onShift,
	label = "Period",
	kind,
}: PeriodStripProps) {
	return (
		<nav
			aria-label={label}
			{...stylex.props(styles.strip)}
			style={{
				viewTransitionName: `period-strip-${kind}`,
				viewTransitionClass: "period-strip",
			}}
		>
			<button
				type="button"
				aria-label="Previous"
				onClick={() => onShift(-1)}
				{...stylex.props(styles.arrow)}
			>
				<CaretLeftIcon size={14} />
			</button>
			<div {...stylex.props(styles.days)}>
				<span
					aria-hidden="true"
					{...stylex.props(styles.pill)}
					style={{ transform: `translateX(${selected * (DAY_WIDTH + GAP)}px)` }}
				/>
				{items.map((item, i) => (
					<button
						// biome-ignore lint/suspicious/noArrayIndexKey: stable slots, so the colour can transition
						key={i}
						type="button"
						aria-current={i === selected ? "date" : undefined}
						onClick={item.onPick}
						{...stylex.props(styles.day, i === selected && styles.selected)}
					>
						<span {...stylex.props(styles.name)}>{item.name}</span>
						<span {...stylex.props(styles.num)}>{item.label}</span>
						<span
							{...stylex.props(styles.dot)}
							style={{ opacity: item.marked ? 1 : 0 }}
						/>
					</button>
				))}
			</div>
			<button
				type="button"
				aria-label="Next"
				onClick={() => onShift(1)}
				{...stylex.props(styles.arrow)}
			>
				<CaretRightIcon size={14} />
			</button>
		</nav>
	);
}
