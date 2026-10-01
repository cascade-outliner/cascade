import { css, cva } from "@cascade/theme/css";
import { useContext } from "react";
import { DragHandleContext } from "../context";

const bullet = cva({
	base: {
		width: "control.xs",
		height: "control.xs",
		flexShrink: 0,
		borderRadius: "circle",
		backgroundColor: "inkSubtle",
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		border: "none",
		padding: "0",
		cursor: "grab",
		touchAction: "none",
	},
	variants: {
		dragging: {
			true: { cursor: "grabbing" },
		},
	},
});

const styles = {
	dot: css({
		width: "dot.lg",
		height: "dot.lg",
		borderRadius: "circle",
		backgroundColor: "muted",
	}),
};

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
			className={bullet({ dragging: drag?.isDragging })}
			{...drag?.listeners}
			{...props}
		>
			<div className={styles.dot} />
		</button>
	);
}
