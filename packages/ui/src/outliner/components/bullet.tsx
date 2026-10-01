import { css } from "@cascade/theme/css";
import { useContext } from "react";
import { DragHandleContext } from "../context";

const styles = {
	bullet: css.raw({
		width: "18px",
		height: "18px",
		flexShrink: 0,
		borderRadius: "50%",
		backgroundColor: "inkSubtle",
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		border: "none",
		padding: 0,
		cursor: "grab",
		touchAction: "none",
	}),
	dragging: css.raw({
		cursor: "grabbing",
	}),
	dot: css({
		width: "6px",
		height: "6px",
		borderRadius: "50%",
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
			className={css(styles.bullet, drag?.isDragging && styles.dragging)}
			{...drag?.listeners}
			{...props}
		>
			<div className={styles.dot} />
		</button>
	);
}
