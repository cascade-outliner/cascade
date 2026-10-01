import { css } from "@cascade/theme/css";
import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";

const DAY_WIDTH = 64;
const GAP = 6;

const styles = {
	strip: css({
		display: "flex",
		justifyContent: "center",
		alignItems: "stretch",
		gap: { base: "1", _narrow: 0 },
		paddingBlock: "2",
		paddingInline: { base: 0, _narrow: "1" },
	}),
	day: css.raw({
		display: "flex",
		flexDirection: "column",
		alignItems: "center",
		gap: "0.5",
		flex: 1,
		minWidth: 0,
		paddingBlock: "2",
		borderWidth: 0,
		borderRadius: "lg",
		backgroundColor: "transparent",
		color: "ink",
		cursor: "pointer",
		position: "relative",
		transition: {
			base: "color 200ms",
			_motionReduce: "none",
		},
	}),
	arrow: css({
		display: "flex",
		alignItems: "center",
		alignSelf: "center",
		flexShrink: 0,
		padding: { base: "2", _narrow: "3" },
		borderWidth: 0,
		borderRadius: "md",
		backgroundColor: { base: "transparent", _hover: "primaryMuted" },
		color: "muted",
		cursor: "pointer",
	}),
	selected: css.raw({
		color: "onPrimary",
		backgroundColor: "primary",
	}),
	// One fill that slides between days, instead of one per day.
	pill: css({
		position: "absolute",
		top: 0,
		left: 0,
		height: "100%",
		boxSizing: "border-box",
		paddingInline: `${GAP / 2}px`,
		transition: {
			base: "transform 260ms cubic-bezier(0.2, 0, 0, 1)",
			_motionReduce: "none",
		},
	}),
	pillFill: css({
		width: "100%",
		height: "100%",
		borderRadius: "lg",
		backgroundColor: "primary",
	}),
	days: css({
		position: "relative",
		display: "grid",
		flex: 1,
		minWidth: 0,
	}),
	name: css({
		fontSize: { base: "100", _narrow: "10px" },
		fontWeight: 500,
		opacity: 0.7,
	}),
	num: css({
		fontSize: { base: "500", _narrow: "300" },
		fontWeight: 600,
	}),
	dot: css({
		width: "4px",
		height: "4px",
		borderRadius: "full",
		backgroundColor: "currentColor",
	}),
};

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
			className={styles.strip}
			style={{
				viewTransitionName: `period-strip-${kind}`,
				viewTransitionClass: "period-strip",
			}}
		>
			<button
				type="button"
				aria-label="Previous"
				onClick={() => onShift(-1)}
				className={styles.arrow}
			>
				<CaretLeftIcon size={14} />
			</button>
			<div
				className={styles.days}
				style={{
					gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`,
					maxWidth: items.length * DAY_WIDTH,
				}}
			>
				<span
					aria-hidden="true"
					className={styles.pill}
					style={{
						width: `${100 / items.length}%`,
						transform: `translateX(${selected * 100}%)`,
					}}
				>
					<span className={styles.pillFill} />
				</span>
				{items.map((item, i) => (
					<button
						// biome-ignore lint/suspicious/noArrayIndexKey: stable slots, so the colour can transition
						key={i}
						type="button"
						aria-current={i === selected ? "date" : undefined}
						onClick={item.onPick}
						className={css(styles.day, i === selected && styles.selected)}
					>
						<span className={styles.name}>{item.name}</span>
						<span className={styles.num}>{item.label}</span>
						<span
							className={styles.dot}
							style={{ opacity: item.marked ? 1 : 0 }}
						/>
					</button>
				))}
			</div>
			<button
				type="button"
				aria-label="Next"
				onClick={() => onShift(1)}
				className={styles.arrow}
			>
				<CaretRightIcon size={14} />
			</button>
		</nav>
	);
}
