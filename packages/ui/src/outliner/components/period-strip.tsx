import { css, cva } from "@cascade/theme/css";
import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";

const DAY_WIDTH = 64;

const styles = {
	strip: css({
		display: "flex",
		justifyContent: "center",
		alignItems: "stretch",
		gap: { base: "1", _narrow: "0" },
		paddingBlock: "2",
		paddingInline: { base: "0", _narrow: "1" },
	}),
	arrow: css({
		display: "flex",
		alignItems: "center",
		alignSelf: "center",
		flexShrink: 0,
		padding: { base: "2", _narrow: "3" },
		borderWidth: "0",
		borderRadius: "md",
		backgroundColor: { base: "transparent", _hover: "primaryMuted" },
		color: "muted",
		cursor: "pointer",
	}),
	// One fill that slides between days, instead of one per day.
	pill: css({
		position: "absolute",
		top: "0",
		left: "0",
		height: "full",
		boxSizing: "border-box",
		paddingInline: "[3px]",
		transitionProperty: "[transform]",
		transitionDuration: { base: "250", _motionReduce: "0" },
		transitionTimingFunction: "out",
	}),
	pillFill: css({
		width: "full",
		height: "full",
		borderRadius: "lg",
		backgroundColor: "primary",
	}),
	days: css({
		position: "relative",
		display: "grid",
		flex: "1",
		minWidth: "0",
	}),
	name: css({
		fontSize: { base: "100", _narrow: "100" },
		fontWeight: 500,
		opacity: "soft",
	}),
	num: css({
		fontSize: { base: "500", _narrow: "300" },
		fontWeight: 600,
	}),
	dot: css({
		width: "dot.md",
		height: "dot.md",
		borderRadius: "full",
		backgroundColor: "currentColor",
	}),
};

const day = cva({
	base: {
		display: "flex",
		flexDirection: "column",
		alignItems: "center",
		gap: "0.5",
		flex: "1",
		minWidth: "0",
		paddingBlock: "2",
		borderWidth: "0",
		borderRadius: "lg",
		backgroundColor: "transparent",
		color: "ink",
		cursor: "pointer",
		position: "relative",
		transitionProperty: "[color]",
		transitionDuration: { base: "200", _motionReduce: "0" },
		transitionTimingFunction: "standard",
	},
	variants: {
		selected: {
			true: {
				color: "onPrimary",
				backgroundColor: "primary",
			},
		},
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
						className={day({ selected: i === selected })}
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
