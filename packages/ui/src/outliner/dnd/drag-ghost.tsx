import { DragOverlay } from "@dnd-kit/core";
import * as stylex from "@stylexjs/stylex";
import { ItemContext } from "../context";
import type { FlatNode } from "../flatten";
import { INDENT, ROW_GAP } from "../layout";

const styles = stylex.create({
	ghost: {
		cursor: "grabbing",
		opacity: 0.85,
	},
});

export interface DragGhostProps {
	row: FlatNode | null;
	children: (row: FlatNode) => React.ReactNode;
}

export function DragGhost({ row, children }: DragGhostProps) {
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
				</div>
			)}
		</DragOverlay>
	);
}
