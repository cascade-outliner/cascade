import { colors } from "@cascade/theme/tokens.stylex";
import * as stylex from "@stylexjs/stylex";
import { useContext } from "react";
import { DragHandleContext } from "../context";

const styles = stylex.create({
	bullet: {
		width: 18,
		height: 18,
		flexShrink: 0,
		borderRadius: "50%",
		backgroundColor: colors.inkSubtle,
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		border: "none",
		padding: 0,
		cursor: "grab",
		touchAction: "none",
	},
	dragging: {
		cursor: "grabbing",
	},
	dot: {
		width: 6,
		height: 6,
		borderRadius: "50%",
		backgroundColor: colors.muted,
	},
});

export interface BulletProps
	extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	/** Shows a ring, indicating the node has hidden children. */
	collapsed?: boolean;
}

/** Drag to move the node; press without dragging to zoom in on it. */
export function Bullet({ collapsed, ...props }: BulletProps) {
	const drag = useContext(DragHandleContext);

	return (
		<button
			ref={drag?.setActivatorNodeRef}
			type="button"
			{...stylex.props(
				styles.bullet,
				drag?.isDragging && styles.dragging,
			)}
			{...drag?.attributes}
			{...drag?.listeners}
			{...props}
		>
			<div {...stylex.props(styles.dot)} />
		</button>
	);
}
