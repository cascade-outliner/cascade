import { colors, fontSize, radius, space } from "@cascade/theme/tokens.stylex";
import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";

const DAY_WIDTH = 64;
const GAP = 6;
const NARROW = "@media (max-width: 480px)";

const styles = stylex.create({
	strip: {
		display: "flex",
		justifyContent: "center",
		alignItems: "stretch",
		gap: { default: space["1"], [NARROW]: 0 },
		paddingBlock: space["2"],
		paddingInline: { default: 0, [NARROW]: space["1"] },
	},
	day: {
		display: "flex",
		flexDirection: "column",
		alignItems: "center",
		gap: space["0.5"],
		flex: 1,
		minWidth: 0,
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
		flexShrink: 0,
		padding: { default: space["2"], [NARROW]: space["3"] },
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
		height: "100%",
		boxSizing: "border-box",
		paddingInline: GAP / 2,
		transition: {
			default: "transform 260ms cubic-bezier(0.2, 0, 0, 1)",
			"@media (prefers-reduced-motion: reduce)": "none",
		},
	},
	pillFill: {
		width: "100%",
		height: "100%",
		borderRadius: radius.lg,
		backgroundColor: colors.primary,
	},
	days: {
		position: "relative",
		display: "grid",
		flex: 1,
		minWidth: 0,
	},
	name: {
		fontSize: { default: fontSize["100"], [NARROW]: 10 },
		fontWeight: 500,
		opacity: 0.7,
	},
	num: {
		fontSize: { default: fontSize["500"], [NARROW]: fontSize["300"] },
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
			<div
				{...stylex.props(styles.days)}
				style={{
					gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`,
					maxWidth: items.length * DAY_WIDTH,
				}}
			>
				<span
					aria-hidden="true"
					{...stylex.props(styles.pill)}
					style={{
						width: `${100 / items.length}%`,
						transform: `translateX(${selected * 100}%)`,
					}}
				>
					<span {...stylex.props(styles.pillFill)} />
				</span>
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
