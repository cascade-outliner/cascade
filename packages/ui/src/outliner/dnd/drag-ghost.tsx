import type { Row } from "@cascade/data";
import {
	colors,
	duration,
	easing,
	fontSize,
	lineHeight,
	radius,
	space,
} from "@cascade/theme/tokens.stylex";
import { DragOverlay } from "@dnd-kit/core";
import * as stylex from "@stylexjs/stylex";
import { ItemContext } from "../context";
import { INDENT, ROW_GAP } from "../layout";

const lift = stylex.keyframes({
	from: { transform: "scale(1)", opacity: 1 },
});

const pop = stylex.keyframes({
	from: { transform: "scale(0)" },
});

const styles = stylex.create({
	ghost: {
		position: "relative",
		cursor: "grabbing",
		opacity: 0.9,
		transform: "scale(1.02)",
		transformOrigin: "left center",
		animationName: lift,
		animationDuration: duration["200"],
		animationTimingFunction: easing.pop,
	},
	pill: {
		position: "absolute",
		top: -6,
		right: -6,
		display: "inline-flex",
		alignItems: "center",
		justifyContent: "center",
		paddingBlock: space.px,
		paddingInline: space["1.5"],
		borderRadius: radius.full,
		backgroundColor: colors.primary,
		color: colors.onPrimary,
		fontSize: fontSize["200"],
		lineHeight: lineHeight.compact,
		whiteSpace: "nowrap",
		animationName: pop,
		animationDuration: duration["300"],
		animationTimingFunction: easing.spring,
	},
});

export interface DragGhostProps {
	row: Row | null;
	children: (row: Row) => React.ReactNode;
}

export function DragGhost({ row, children }: DragGhostProps) {
	const childCount = row?.childCount ?? 0;
	return (
		<DragOverlay dropAnimation={null}>
			{row && (
				<div
					{...stylex.props(styles.ghost)}
					style={{ paddingLeft: row.depth * INDENT, paddingBottom: ROW_GAP }}
				>
					<ItemContext.Provider value={row}>
						{children(row)}
					</ItemContext.Provider>
					{childCount > 0 && (
						<span {...stylex.props(styles.pill)}>+{childCount}</span>
					)}
				</div>
			)}
		</DragOverlay>
	);
}
