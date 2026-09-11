import { colors } from "@cascade/theme/tokens.stylex";
import { Check } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";

const styles = stylex.create({
	marker: {
		width: 18,
		height: 18,
		flexShrink: 0,
		borderRadius: "50%",
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
	},
	todo: {
		border: "1.5px solid rgba(43, 45, 51, 0.22)",
	},
	done: {
		backgroundColor: colors.primary,
		color: colors.canvas,
	},
	ai: {
		border: "1.5px dashed rgba(43, 45, 51, 0.3)",
	},
});

export type TaskMarkerVariant = "todo" | "done" | "ai";

export interface TaskMarkerProps {
	variant: TaskMarkerVariant;
}

export function TaskMarker({ variant }: TaskMarkerProps) {
	return (
		<div {...stylex.props(styles.marker, styles[variant])}>
			{variant === "done" && <Check size={11} weight="bold" />}
		</div>
	);
}
