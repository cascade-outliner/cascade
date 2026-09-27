import { colors, fontSize, radius, space } from "@cascade/theme/tokens.stylex";
import * as stylex from "@stylexjs/stylex";

const styles = stylex.create({
	pill: {
		display: "inline-flex",
		alignItems: "center",
		gap: space["1"],
		flexShrink: 0,
		paddingBlock: "2.5px",
		paddingInline: space["2"],
		borderRadius: radius.full,
		fontSize: fontSize["300"],
		fontWeight: 500,
		lineHeight: 1.4,
		whiteSpace: "nowrap",
		pointerEvents: "none",
	},
	neutral: {
		backgroundColor: colors.inkSubtle,
		color: colors.muted,
	},
	primary: {
		backgroundColor: colors.surface,
		color: colors.primary,
	},
	info: {
		backgroundColor: colors.infoMuted,
		color: colors.info,
	},
});

export type PillTone = "neutral" | "primary" | "info";

export interface PillProps extends React.HTMLAttributes<HTMLSpanElement> {
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
		<span {...stylex.props(styles.pill, styles[tone])} {...props}>
			{icon}
			{children}
		</span>
	);
}
