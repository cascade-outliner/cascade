import {
	borderWidth,
	colors,
	duration,
	easing,
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
		borderWidth: borderWidth.thick,
		borderStyle: "solid",
		borderColor: colors.borderStrong,
		transitionProperty: "background-color, border-color, transform",
		transitionDuration: duration["150"],
		transitionTimingFunction: easing.soft,
		transform: { default: null, ":active": "scale(0.88)" },
		":focus-visible": {
			boxShadow: shadow.focusRing,
			borderRadius: radius.full,
		},
	},
	done: {
		borderColor: colors.primary,
		backgroundColor: colors.primary,
	},
	icon: {
		position: "absolute",
		top: "50%",
		left: "50%",
		transform: "translate(-50%, -50%) scale(0.3)",
		opacity: 0,
		color: colors.canvas,
		pointerEvents: "none",
		transitionProperty: "transform, opacity",
		transitionDuration: duration["100"],
		transitionTimingFunction: easing.exit,
	},
	iconDone: {
		transform: "translate(-50%, -50%) scale(1)",
		opacity: 1,
		transitionDuration: duration["300"],
		transitionTimingFunction: easing.spring,
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
				{...stylex.props(styles.marker, variant === "done" && styles.done)}
				{...props}
			/>
			<CheckIcon
				size={11}
				weight="bold"
				aria-hidden
				{...stylex.props(styles.icon, variant === "done" && styles.iconDone)}
			/>
		</span>
	);
}
