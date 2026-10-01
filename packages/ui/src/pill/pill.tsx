import { cva } from "@cascade/theme/css";

const pill = cva({
	base: {
		display: "inline-flex",
		alignItems: "center",
		gap: "1",
		flexShrink: 0,
		paddingBlock: "2.5px",
		paddingInline: "2",
		borderRadius: "full",
		fontSize: "300",
		fontWeight: 500,
		lineHeight: 1.4,
		whiteSpace: "nowrap",
		pointerEvents: "none",
	},
	variants: {
		tone: {
			neutral: {
				backgroundColor: "inkSubtle",
				color: "muted",
			},
			primary: {
				backgroundColor: "surface",
				color: "primary",
			},
			info: {
				backgroundColor: "infoMuted",
				color: "info",
			},
		},
	},
});

export type PillTone = "neutral" | "primary" | "info";

export interface PillProps
	extends Omit<React.HTMLAttributes<HTMLSpanElement>, "className" | "style"> {
	tone?: PillTone;
	icon?: React.ReactNode;
	children: React.ReactNode;
}

/** A small rounded label for a piece of node data: a due date, a tag, a status. */
export function Pill({
	tone = "neutral",
	icon,
	children,
	...props
}: PillProps) {
	return (
		<span className={pill({ tone })} {...props}>
			{icon}
			{children}
		</span>
	);
}
