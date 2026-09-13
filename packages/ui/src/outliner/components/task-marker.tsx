import { borderWidth, colors } from "@cascade/theme/tokens.stylex";
import { CheckIcon } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";

const styles = stylex.create({
	marker: {
		width: { default: 18, "@media (hover: none)": 22 },
		height: { default: 18, "@media (hover: none)": 22 },
		flexShrink: 0,
		borderRadius: "50%",
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		cursor: "pointer",
	},
	todo: {
		borderWidth: borderWidth.thick,
		borderStyle: "solid",
		borderColor: colors.borderStrong,
	},
	done: {
		backgroundColor: colors.primary,
		color: colors.canvas,
	},
});

export type TaskMarkerVariant = "todo" | "done";

export interface TaskMarkerProps extends React.HTMLAttributes<HTMLDivElement> {
	variant: TaskMarkerVariant;
}

export function TaskMarker({ variant, ...props }: TaskMarkerProps) {
	return (
		<div
			{...stylex.props(
				styles.marker,
				variant === "done" && styles.done,
				variant === "todo" && styles.todo,
			)}
			{...props}
		>
			{variant === "done" && <CheckIcon size={11} weight="bold" />}
		</div>
	);
}
