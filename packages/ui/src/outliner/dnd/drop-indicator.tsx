import { colors } from "@cascade/theme/tokens.stylex";
import * as stylex from "@stylexjs/stylex";
import { INDENT, ROW_GAP, ROW_INSET } from "../layout";
import type { Projection } from "./projection";

const styles = stylex.create({
	line: {
		position: "absolute",
		top: 0,
		left: 0,
		height: 2,
		borderRadius: 1,
		backgroundColor: colors.primary,
		pointerEvents: "none",
		zIndex: 1,
		"::before": {
			content: "",
			position: "absolute",
			left: -4,
			top: -3,
			width: 8,
			height: 8,
			borderRadius: "50%",
			backgroundColor: colors.primary,
		},
	},
});

export interface DropIndicatorProps {
	projection: Projection;
	overStart: number;
	overEnd: number;
}

export function DropIndicator({
	projection,
	overStart,
	overEnd,
}: DropIndicatorProps) {
	const y = projection.before ? overStart : overEnd - ROW_GAP / 2;
	return (
		<div
			{...stylex.props(styles.line)}
			style={{
				left: projection.depth * INDENT + ROW_INSET,
				right: ROW_INSET,
				transform: `translateY(${y - 1}px)`,
			}}
		/>
	);
}
