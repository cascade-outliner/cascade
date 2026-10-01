import type { Row } from "@cascade/data";
import { css } from "@cascade/theme/css";
import { DragOverlay } from "@dnd-kit/core";
import { ItemContext } from "../context";
import { INDENT, ROW_GAP } from "../layout";

const styles = {
	ghost: css({
		position: "relative",
		cursor: "grabbing",
		opacity: "strong",
	}),
	pill: css({
		position: "absolute",
		top: "-1.5",
		right: "-1.5",
		display: "inline-flex",
		alignItems: "center",
		justifyContent: "center",
		paddingBlock: "px",
		paddingInline: "1.5",
		borderRadius: "full",
		backgroundColor: "primary",
		color: "onPrimary",
		fontSize: "200",
		lineHeight: "compact",
		whiteSpace: "nowrap",
	}),
};

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
					className={styles.ghost}
					style={{ paddingLeft: row.depth * INDENT, paddingBottom: ROW_GAP }}
				>
					<ItemContext.Provider value={row}>
						{children(row)}
					</ItemContext.Provider>
					{childCount > 0 && <span className={styles.pill}>+{childCount}</span>}
				</div>
			)}
		</DragOverlay>
	);
}
