import { colors, fontSize, radius, space } from "@cascade/theme/tokens.stylex";
import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";

const styles = stylex.create({
	group: {
		cursor: "default",
		display: "inline-flex",
		alignItems: "center",
		gap: space["2"],
	},
	key: {
		cursor: "default",
		display: "inline-flex",
		alignItems: "center",
		justifyContent: "center",
		paddingBlock: space["1"],
		paddingInline: space["5"],
		borderRadius: radius.xs,
		backgroundColor: colors.muted,
		color: colors.white,
		fontFamily: "monospace",
		fontSize: fontSize["200"],
		lineHeight: 1.8,
	},
});

export interface KbdProps {
	children: ReactNode;
}

export function Kbd({ children }: KbdProps) {
	return <kbd {...stylex.props(styles.key)}>{children}</kbd>;
}

export function KbdGroup({ children }: { children: ReactNode }) {
	return <kbd {...stylex.props(styles.group)}>{children}</kbd>;
}
