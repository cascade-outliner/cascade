import { colors } from "@cascade/theme/tokens.stylex";
import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";

const styles = stylex.create({
	group: {
		cursor: "default",
		display: "inline-flex",
		alignItems: "center",
		gap: 2,
	},
	key: {
		cursor: "default",
		display: "inline-flex",
		alignItems: "center",
		justifyContent: "center",
		paddingBlock: 1,
		paddingInline: 5,
		borderRadius: 5,
		backgroundColor: colors.muted,
		color: colors.white,
		fontFamily: "monospace",
		fontSize: "0.7rem",
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
