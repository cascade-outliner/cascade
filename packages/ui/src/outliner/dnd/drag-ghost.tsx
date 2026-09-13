import {
	colors,
	fontSize,
	lineHeight,
	radius,
	space,
} from "@cascade/theme/tokens.stylex";
import { DragOverlay } from "@dnd-kit/core";
import * as stylex from "@stylexjs/stylex";
import { ItemContext } from "../context";
import type { FlatNode } from "../flatten";
import { INDENT, ROW_GAP } from "../layout";

const styles = stylex.create({
	ghost: {
		position: "relative",
		cursor: "grabbing",
		opacity: 0.85,
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
		color: colors.white,
		fontSize: fontSize["200"],
		lineHeight: lineHeight.compact,
		whiteSpace: "nowrap",
	},
});

export interface DragGhostProps {
	row: FlatNode | null;
	children: (row: FlatNode) => React.ReactNode;
}

export function DragGhost({ row, children }: DragGhostProps) {
	const childCount = row?.node.children.length ?? 0;
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
