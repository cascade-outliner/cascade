import { cva } from "@cascade/theme/css";

const row = cva({
	base: {
		position: "relative",
		display: "flex",
		alignItems: "center",
		gap: { base: "2.5", _mobile: "2" },
		paddingBlock: { base: "1.5", _pointerCoarse: "2.5" },
		paddingInline: "2.5",
		borderRadius: "lg",
		transitionProperty: "[background-color, box-shadow]",
		transitionDuration: "50",
		transitionTimingFunction: "inOut",
		"&:hover:not(:focus-within)": {
			backgroundColor: "surface",
		},
		_focusWithin: {
			backgroundColor: "white",
			boxShadow: "focus",
		},
	},
	variants: {
		active: {
			true: {
				backgroundColor: "white",
				boxShadow: "focus",
			},
		},
	},
});

export interface RowProps extends React.HTMLAttributes<HTMLDivElement> {
	active?: boolean;
	children: React.ReactNode;
}

export function Row({ active, children, ...props }: RowProps) {
	return (
		<div className={row({ active })} {...props}>
			{children}
		</div>
	);
}
