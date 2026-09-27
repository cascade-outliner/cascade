import { fonts } from "@cascade/theme/tokens.stylex";
import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";
import { site, siteFontSize } from "@/theme/site.stylex";

const styles = stylex.create({
	eyebrow: {
		display: "block",
		fontFamily: fonts.mono,
		fontSize: siteFontSize.eyebrow,
		fontWeight: 500,
		letterSpacing: "0.04em",
		textTransform: "uppercase",
		lineHeight: 1.4,
	},
	primary: { color: site.primary },
	muted: { color: site.muted },
	onDark: { color: site.onDarkMuted },
});

export interface EyebrowProps {
	children: ReactNode;
	tone?: "primary" | "muted" | "onDark";
	style?: stylex.StyleXStyles;
}

/** The small mono label that sits above a heading. */
export function Eyebrow({ children, tone = "primary", style }: EyebrowProps) {
	return (
		<span {...stylex.props(styles.eyebrow, styles[tone], style)}>
			{children}
		</span>
	);
}
