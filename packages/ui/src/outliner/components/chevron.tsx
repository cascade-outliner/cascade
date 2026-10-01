import { cva } from "@cascade/theme/css";
import { CaretRightIcon } from "@phosphor-icons/react";

const chevron = cva({
	base: {
		width: { base: "16px", _pointerCoarse: "24px" },
		height: { base: "18px", _pointerCoarse: "24px" },
		flexShrink: 0,
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		border: "none",
		padding: 0,
		backgroundColor: "transparent",
		color: "muted",
		cursor: "pointer",
		opacity: { base: 0.35, _pointerCoarse: 0.55 },
		transition: "transform token(durations.100) ease-in-out",
		_hover: {
			opacity: 1,
		},
		_focusVisible: {
			opacity: 1,
			boxShadow: "focusRing",
			borderRadius: "sm",
		},
	},
	variants: {
		open: {
			true: { transform: "rotate(90deg)" },
		},
		hidden: {
			true: { visibility: "hidden" },
		},
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
			aria-label="Toggle children"
			aria-expanded={open}
			className={chevron({ open, hidden })}
			{...props}
		>
			<CaretRightIcon size={12} weight="bold" />
		</button>
	);
}
