import { css } from "@cascade/theme/css";
import { ArrowElbowDownRightIcon } from "@phosphor-icons/react";
import { INDENT, NEST_SHIFT, ROW_GAP, ROW_INSET } from "../layout";
import type { Projection } from "./projection";

const styles = {
	line: css({
		position: "absolute",
		top: 0,
		left: 0,
		height: "2px",
		borderRadius: "1px",
		backgroundColor: "primary",
		pointerEvents: "none",
		zIndex: 1,
	}),
	dot: css({
		position: "absolute",
		left: "-4px",
		top: "-3px",
		width: "8px",
		height: "8px",
		borderRadius: "50%",
		backgroundColor: "primary",
	}),
	nestIcon: css({
		position: "absolute",
		left: "-15px",
		top: "-8px",
		display: "flex",
		color: "primary",
	}),
};

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
	const left =
		projection.depth * INDENT +
		ROW_INSET +
		(projection.nesting ? NEST_SHIFT : 0);
	return (
		<div
			className={styles.line}
			style={{
				left,
				right: ROW_INSET,
				transform: `translateY(${y - 1}px)`,
			}}
		>
			{projection.nesting ? (
				<ArrowElbowDownRightIcon
					size={12}
					weight="bold"
					className={styles.nestIcon}
				/>
			) : (
				<div className={styles.dot} />
			)}
		</div>
	);
}
