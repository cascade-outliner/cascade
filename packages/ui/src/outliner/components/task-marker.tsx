import { css, cva } from "@cascade/theme/css";
import { CheckIcon } from "@phosphor-icons/react";

const styles = {
	wrapper: css({
		position: "relative",
		width: { base: "18px", _pointerCoarse: "22px" },
		height: { base: "18px", _pointerCoarse: "22px" },
		flexShrink: 0,
		display: "flex",
	}),
	icon: css({
		position: "absolute",
		top: "50%",
		left: "50%",
		transform: "translate(-50%, -50%)",
		color: "canvas",
		pointerEvents: "none",
	}),
};

const marker = cva({
	base: {
		appearance: "none",
		margin: 0,
		width: "100%",
		height: "100%",
		borderRadius: "50%",
		padding: 0,
		backgroundColor: "transparent",
		cursor: "pointer",
		_focusVisible: {
			boxShadow: "focusRing",
			borderRadius: "full",
		},
	},
	variants: {
		variant: {
			todo: {
				borderWidth: "thick",
				borderStyle: "solid",
				borderColor: "borderStrong",
			},
			done: {
				borderWidth: 0,
				borderStyle: "none",
				backgroundColor: "primary",
			},
		},
	},
});

export type TaskMarkerVariant = "todo" | "done";

export interface TaskMarkerProps
	extends React.InputHTMLAttributes<HTMLInputElement> {
	variant: TaskMarkerVariant;
}

export function TaskMarker({ variant, ...props }: TaskMarkerProps) {
	return (
		<span className={styles.wrapper}>
			<input
				type="checkbox"
				checked={variant === "done"}
				readOnly
				className={marker({ variant })}
				{...props}
			/>
			{variant === "done" && (
				<CheckIcon size={11} weight="bold" className={styles.icon} />
			)}
		</span>
	);
}
