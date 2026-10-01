import { css } from "@cascade/theme/css";

const styles = {
	pill: css.raw({
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
	}),
	neutral: css.raw({
		backgroundColor: "inkSubtle",
		color: "muted",
	}),
	primary: css.raw({
		backgroundColor: "surface",
		color: "primary",
	}),
	info: css.raw({
		backgroundColor: "infoMuted",
		color: "info",
	}),
};

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
		<span className={css(styles.pill, styles[tone])} {...props}>
			{icon}
			{children}
		</span>
	);
}
