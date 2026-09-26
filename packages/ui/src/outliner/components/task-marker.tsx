import {
	borderWidth,
	colors,
	radius,
	shadow,
} from "@cascade/theme/tokens.stylex";
import { CheckIcon } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";

const styles = stylex.create({
	wrapper: {
		position: "relative",
		width: { default: 18, "@media (hover: none)": 22 },
		height: { default: 18, "@media (hover: none)": 22 },
		flexShrink: 0,
		display: "flex",
	},
	marker: {
		appearance: "none",
		margin: 0,
		width: "100%",
		height: "100%",
		borderRadius: "50%",
		padding: 0,
		backgroundColor: "transparent",
		cursor: "pointer",
		":focus-visible": {
			boxShadow: shadow.focusRing,
			borderRadius: radius.full,
		},
	},
	todo: {
		borderWidth: borderWidth.thick,
		borderStyle: "solid",
		borderColor: colors.borderStrong,
	},
	done: {
		borderWidth: 0,
		borderStyle: "none",
		backgroundColor: colors.primary,
	},
	icon: {
		position: "absolute",
		top: "50%",
		left: "50%",
		transform: "translate(-50%, -50%)",
		color: colors.canvas,
		pointerEvents: "none",
	},
});

export type TaskMarkerVariant = "todo" | "done";

export interface TaskMarkerProps
	extends React.InputHTMLAttributes<HTMLInputElement> {
	variant: TaskMarkerVariant;
}

export function TaskMarker({ variant, ...props }: TaskMarkerProps) {
	return (
		<span {...stylex.props(styles.wrapper)}>
			<input
				type="checkbox"
				checked={variant === "done"}
				readOnly
				{...stylex.props(
					styles.marker,
					variant === "done" && styles.done,
					variant === "todo" && styles.todo,
				)}
				{...props}
			/>
			{variant === "done" && (
				<CheckIcon size={11} weight="bold" {...stylex.props(styles.icon)} />
			)}
		</span>
	);
}
