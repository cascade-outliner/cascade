import { colors, duration, radius, shadow } from "@cascade/theme/tokens.stylex";
import { CaretRight } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";

const styles = stylex.create({
	chevron: {
		width: { default: 16, "@media (hover: none)": 24 },
		height: { default: 18, "@media (hover: none)": 24 },
		flexShrink: 0,
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		border: "none",
		padding: 0,
		backgroundColor: "transparent",
		color: colors.muted,
		cursor: "pointer",
		opacity: { default: 0.35, "@media (hover: none)": 0.55 },
		transition: `transform ${duration["100"]} ease-in-out`,
		":hover": {
			opacity: 1,
		},
		":focus-visible": {
			opacity: 1,
			boxShadow: shadow.focusRing,
			borderRadius: radius.sm,
		},
	},
	open: {
		transform: "rotate(90deg)",
	},
	hidden: {
		visibility: "hidden",
	},
});

export interface ChevronProps
	extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	/** Whether the node's children are currently shown. */
	open?: boolean;
	/** Renders invisible but keeps its layout space, e.g. for leaf nodes. */
	hidden?: boolean;
}

/** Toggles whether a node's children are shown. */
export function Chevron({ open, hidden, ...props }: ChevronProps) {
	return (
		<button
			type="button"
			tabIndex={hidden ? -1 : 0}
			{...stylex.props(
				styles.chevron,
				open && styles.open,
				hidden && styles.hidden,
			)}
			{...props}
		>
			<CaretRight size={12} weight="bold" />
		</button>
	);
}
