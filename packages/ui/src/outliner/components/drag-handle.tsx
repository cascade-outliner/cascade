import { colors } from "@cascade/theme/tokens.stylex";
import { DotsSixVertical } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import { useContext, useRef } from "react";
import { DragHandleContext } from "../context";

const styles = stylex.create({
	handle: {
		width: { default: 16, "@media (hover: none)": 24 },
		height: { default: 18, "@media (hover: none)": 24 },
		flexShrink: 0,
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		border: "none",
		padding: 0,
		backgroundColor: "transparent",
		font: "inherit",
		color: colors.muted,
		cursor: "grab",
		touchAction: "none",
		userSelect: "none",
		WebkitTouchCallout: "none",
		outline: "none",
		opacity: { default: 0.35, "@media (hover: none)": 0.55 },
		":hover": {
			opacity: 1,
		},
		":focus-visible": {
			opacity: 1,
			boxShadow: "0 0 0 2px rgba(173, 76, 78, 0.35)",
			borderRadius: 4,
		},
	},
	dragging: {
		cursor: "grabbing",
		opacity: 1,
	},
});

export function DragHandle({
	onTouchStart,
	onTouchEnd,
	onTouchCancel,
	onContextMenu,
	...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
	const drag = useContext(DragHandleContext);
	const touching = useRef(false);

	return (
		<button
			ref={drag?.setActivatorNodeRef}
			type="button"
			{...stylex.props(styles.handle, drag?.isDragging && styles.dragging)}
			{...drag?.attributes}
			{...drag?.listeners}
			onTouchStart={(event) => {
				touching.current = true;
				event.stopPropagation();
				onTouchStart?.(event);
			}}
			onTouchEnd={(event) => {
				touching.current = false;
				onTouchEnd?.(event);
			}}
			onTouchCancel={(event) => {
				touching.current = false;
				onTouchCancel?.(event);
			}}
			onContextMenu={(event) => {
				if (touching.current || drag?.isDragging) {
					event.preventDefault();
					event.stopPropagation();
					return;
				}
				onContextMenu?.(event);
			}}
			{...props}
		>
			<DotsSixVertical size={14} />
		</button>
	);
}
