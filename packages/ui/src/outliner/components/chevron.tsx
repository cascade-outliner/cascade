import { cva } from "@cascade/theme/css";
import { CaretRightIcon } from "@phosphor-icons/react";

const chevron = cva({
	base: {
		width: { base: "icon.md", _pointerCoarse: "control.md" },
		height: { base: "control.xs", _pointerCoarse: "control.md" },
		flexShrink: 0,
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		border: "none",
		padding: "0",
		backgroundColor: "transparent",
		color: "muted",
		cursor: "pointer",
		opacity: { base: "faint", _pointerCoarse: "muted" },
		transitionProperty: "[transform]",
		transitionDuration: "100",
		transitionTimingFunction: "inOut",
		_hover: {
			opacity: "full",
		},
		_focusVisible: {
			opacity: "full",
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
